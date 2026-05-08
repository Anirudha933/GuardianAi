// lib/ollama.ts
// ─────────────────────────────────────────────────────────────────────────────
// Standalone Ollama REST API client for GuardianAI.
//
// Responsibilities:
//   1. Send chat completions to a local Ollama instance via /api/chat.
//   2. Enforce JSON output via Ollama's native "format" parameter.
//   3. Queue concurrent requests (p-queue, concurrency: 1) so a consumer
//      laptop GPU is never double-booked.
//   4. Provide a cached health check (GET /api/tags) so the LLM router
//      can decide whether to use Ollama or fall back to Groq.
//   5. Apply AbortController-based timeouts and exponential-backoff retries.
//
// This file has ZERO imports from groq.ts or llmRouter.ts.
// It is a leaf dependency — safe from circular import issues.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import PQueue from 'p-queue';
import { config } from 'dotenv';

config();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/** Base URL for the local Ollama server. */
const OLLAMA_BASE_URL: string =
  process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Per-request timeout in milliseconds.
 * Local 8B models on a mid-range laptop typically respond within 15–40 s.
 * 120 s gives headroom for long prompts (e.g. 3 000-char DOM chunks).
 */
const OLLAMA_TIMEOUT: number =
  Number(process.env.OLLAMA_TIMEOUT) || 120_000;

/** Maximum retry attempts per request (0 = no retries). */
const MAX_RETRIES = 2;

// ═══════════════════════════════════════════════════════════════════════════
// MODEL REGISTRY — consumer hardware only, NO 70B models
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Models exposed to the router.  Keys are semantic roles, not task types —
 * the router in llmRouter.ts maps task types to these roles.
 */
export const OLLAMA_MODELS: Record<string, string> = {
  /** Fast, general-purpose completions (intent, formatting, filtering). */
  general:   process.env.OLLAMA_GENERAL_MODEL   || 'llama3:8b',

  /** Deeper reasoning (classification, summarization). */
  reasoning: process.env.OLLAMA_REASONING_MODEL || 'deepseek-r1:8b',

  /** Code-aware tasks (future use). */
  coding:    process.env.OLLAMA_CODING_MODEL    || 'qwen2.5:7b',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CONCURRENCY LIMITER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * p-queue instance with concurrency: 1.
 *
 * Why concurrency 1?
 *   On consumer hardware a single GPU can only run one inference pass at a
 *   time.  Sending a second request while the first is mid-generation will
 *   either queue internally in Ollama (adding latency) or OOM the GPU.
 *   By queuing on our side we get deterministic ordering and can log the
 *   queue depth for observability.
 */
const queue = new PQueue({ concurrency: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK (cached)
// ═══════════════════════════════════════════════════════════════════════════

interface HealthState {
  healthy: boolean;
  timestamp: number;
}

/** Cached health result.  Starts as unhealthy so the first call always pings. */
let healthCache: HealthState = { healthy: false, timestamp: 0 };

/** How long (ms) to trust a previous health-check result. */
const HEALTH_CACHE_TTL = 30_000;

/**
 * Check whether the local Ollama process is reachable.
 *
 * Returns a cached result if the last successful/failed check was less than
 * HEALTH_CACHE_TTL ago.  This avoids adding 30–80 ms of latency to every
 * single LLM call just to ping /api/tags.
 */
export async function isOllamaHealthy(): Promise<boolean> {
  const now = Date.now();

  // Return cached result if still fresh
  if (now - healthCache.timestamp < HEALTH_CACHE_TTL) {
    return healthCache.healthy;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);

    const res = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
      timeout: 5_000,
    });

    clearTimeout(timer);

    const healthy = res.status === 200;
    healthCache = { healthy, timestamp: now };
    return healthy;
  } catch {
    healthCache = { healthy: false, timestamp: now };
    return false;
  }
}

/**
 * Force-expire the health cache.
 * Call this after you know Ollama has been restarted / stopped.
 */
export function resetHealthCache(): void {
  healthCache = { healthy: false, timestamp: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Queue a chat completion request to the local Ollama instance.
 *
 * @param prompt       - The user-facing prompt text.
 * @param model        - Ollama model tag (e.g. "llama3:8b").
 * @param systemPrompt - System instruction; defaults to JSON-only output.
 * @param maxTokens    - Maps to Ollama's `num_predict` option.
 * @returns Parsed JSON object, or an error descriptor object.
 */
export async function ollamaCall(
  prompt: string,
  model: string = OLLAMA_MODELS.general,
  systemPrompt: string = 'Respond only in valid JSON.',
  maxTokens: number = 1024,
): Promise<Record<string, unknown>> {
  // p-queue guarantees concurrency: 1 — the returned promise resolves
  // only after the queued task finishes.
  return queue.add(
    () => executeOllamaRequest(prompt, model, systemPrompt, maxTokens),
  ) as Promise<Record<string, unknown>>;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL — single request execution with retries
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute a single Ollama /api/chat request with:
 *   • AbortController-based client-side timeout
 *   • Up to MAX_RETRIES retries with exponential backoff
 *   • Immediate bail-out on ECONNREFUSED (server is down, retries are futile)
 */
async function executeOllamaRequest(
  prompt: string,
  model: string,
  systemPrompt: string,
  maxTokens: number,
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // ── Per-attempt AbortController ────────────────────────────────────
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

    try {
      const response = await axios.post(
        `${OLLAMA_BASE_URL}/api/chat`,
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: prompt },
          ],
          stream: false,                  // We need the full response in one shot
          options: {
            temperature: 0.1,             // Near-deterministic for structured output
            num_predict: maxTokens,
          },
          format: 'json',                 // Ollama-native JSON constraint
        },
        {
          signal: controller.signal,
          timeout: OLLAMA_TIMEOUT,
        },
      );

      clearTimeout(timer);

      // ── Parse response ────────────────────────────────────────────────
      const content: string = response.data?.message?.content ?? '{}';

      try {
        return JSON.parse(content);
      } catch {
        // JSON parse failure — retry, the model may recover
        console.warn(
          `[Ollama] JSON parse failure (attempt ${attempt + 1}/${MAX_RETRIES + 1}). ` +
          `Preview: ${content.slice(0, 200)}`,
        );
        lastError = new Error('ollama_parse_failure');
        continue;
      }
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;

      // ── Categorize the error ─────────────────────────────────────────
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        console.warn(
          `[Ollama] Request timed out after ${OLLAMA_TIMEOUT}ms ` +
          `(attempt ${attempt + 1}/${MAX_RETRIES + 1}).`,
        );
      } else if (err.code === 'ECONNREFUSED') {
        // Server is not running — retrying is pointless
        console.error(
          '[Ollama] Connection refused. Is the Ollama server running on ' +
          `${OLLAMA_BASE_URL}?`,
        );
        resetHealthCache();
        break;                             // ← exit retry loop immediately
      } else {
        console.warn(
          `[Ollama] Request error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ` +
          `${err?.message ?? err}`,
        );
      }

      // ── Backoff before next attempt ──────────────────────────────────
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(2 ** attempt * 1_000, 8_000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted (or ECONNREFUSED bail-out)
  return {
    error: 'ollama_failure',
    message: lastError?.message ?? 'Unknown Ollama error',
  };
}
