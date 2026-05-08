// lib/groq.ts
// ─────────────────────────────────────────────────────────────────────────────
// Groq Cloud LLM client for GuardianAI.
//
// EXPORTS:
//   groqCallDirect  – The raw Groq API implementation.  Used by llmRouter.ts
//                     as the Groq-side provider.
//   groqCall        – Backward-compatible alias of groqCallDirect.  Every
//                     existing skill that does
//                       import { groqCall } from '../lib/groq.js'
//                     continues to work with ZERO changes.
//
// This file has ZERO imports from ollama.ts or llmRouter.ts.
// It is a leaf dependency — safe from circular import issues.
// ─────────────────────────────────────────────────────────────────────────────

import Groq from 'groq-sdk';
import { config } from 'dotenv';

config();

// ═══════════════════════════════════════════════════════════════════════════
// GROQ MODEL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const MODELS = {
  fast:      'llama-3.1-8b-instant',
  reasoning: 'llama-3.3-70b-versatile',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON CLIENT
// ═══════════════════════════════════════════════════════════════════════════

let client: any = null;

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY EXPORT — groqCallDirect
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a chat completion request to the Groq Cloud API.
 *
 * This is the "direct" Groq call — it always hits the Groq API, never Ollama.
 * The LLM router (llmRouter.ts) imports this function by name to use as its
 * Groq-side provider.
 *
 * @param prompt       – The user-facing prompt text.
 * @param modelKey     – 'fast' (8B instant) or 'reasoning' (70B versatile).
 * @param systemPrompt – System instruction; defaults to JSON-only output.
 * @param maxTokens    – Maximum tokens to generate.
 * @returns Parsed JSON object, or an error descriptor object.
 */
export async function groqCallDirect(
  prompt: string,
  modelKey: keyof typeof MODELS = 'fast',
  systemPrompt = 'Respond only in valid JSON.',
  maxTokens = 1024,
): Promise<Record<string, unknown>> {
  const groq = getClient();
  let attempt = 0;

  while (attempt < 3) {
    try {
      const res = await groq.chat.completions.create({
        model: MODELS[modelKey],
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });
      const content = res.choices[0].message.content ?? '{}';

      try {
        return JSON.parse(content);
      } catch {
        return {
          error: 'groq_parse_failure',
          message: 'Groq returned invalid JSON',
          preview: content.slice(0, 200),
        };
      }
    } catch (err: any) {
      if (isRateLimitError(err)) {
        const delay = Math.min(2 ** attempt * 2000 + Math.random() * 1000, 30000);
        await new Promise(r => setTimeout(r, delay));
        attempt++;
      } else {
        console.error('Groq error:', err?.message);
        return { error: 'groq_failure', message: String(err?.message) };
      }
    }
  }

  return { error: 'max_retries_exceeded' };
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKWARD-COMPATIBLE ALIAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Backward-compatible alias for groqCallDirect.
 *
 * All existing skill files import this name:
 *   import { groqCall } from '../lib/groq.js';
 *
 * By aliasing it here, we guarantee zero breakage across the entire codebase.
 * Over time, skills can be migrated to use routeLLM() from llmRouter.ts
 * for task-based routing.  Until then, groqCall continues to hit Groq
 * directly, exactly as before.
 */
export const groqCall = groqCallDirect;

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getClient(): any {
  if (client) return client;

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set');
  }

  client = new (Groq as any)({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

function isRateLimitError(err: any): boolean {
  return (
    err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.response?.status === 429 ||
    err?.error?.status === 429
  );
}
