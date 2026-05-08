// lib/llmRouter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Task-based LLM router for GuardianAI.
//
// Instead of the coarse "fast" / "reasoning" split, this router understands
// the *semantic intent* of each LLM call.  Each task type is mapped to:
//   • a preferred provider  (Ollama local  or  Groq cloud)
//   • a specific model on that provider
//   • whether results are safe to cache
//
// Fallback logic:
//   1. If the preferred provider is Ollama, run a health check first.
//   2. If Ollama is unreachable → transparent fallback to Groq.
//   3. If Ollama responds but returns an error object → fallback to Groq.
//   4. Groq-preferred tasks always go directly to Groq (no Ollama attempt).
//
// Dependency graph (acyclic):
//   ollama.ts  ←──  llmRouter.ts  ──→  groq.ts
//   (leaf)                               (leaf)
// ─────────────────────────────────────────────────────────────────────────────

import { ollamaCall, isOllamaHealthy, OLLAMA_MODELS } from './ollama.js';
import { groqCallDirect } from './groq.js';

// ═══════════════════════════════════════════════════════════════════════════
// TASK TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Semantic task types recognised by the router.
 *
 * These map 1:1 to the kinds of LLM work GuardianAI actually performs.
 * Adding a new task type is a two-step process:
 *   1. Add the literal to this union.
 *   2. Add a corresponding entry in ROUTE_TABLE below.
 */
export type TaskType =
  | 'intent'              // Quick intent detection (e.g. "is this relevant?")
  | 'formatting'          // Formatting / report generation
  | 'tos_filter'          // Binary relevance filter on ToS chunks
  | 'summarization'       // Summarise research papers, contexts
  | 'classification'      // Dark pattern classification with evidence
  | 'legal_reasoning'     // Deep ToS clause extraction and severity scoring
  | 'taxonomy_mapping';   // Map novel patterns to existing taxonomy

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Per-task routing metadata.
 *
 * @field preferred    – Which provider to try first.
 * @field ollamaModel  – Model tag to use if routed to Ollama.
 * @field groqModelKey – Model key ('fast' | 'reasoning') for Groq fallback.
 * @field cacheable    – Whether the cache layer (cache.ts) may store results.
 */
interface TaskRoute {
  preferred:    'ollama' | 'groq';
  ollamaModel:  string;
  groqModelKey: 'fast' | 'reasoning';
  cacheable:    boolean;
}

/**
 * Master routing table.
 *
 * Design rationale:
 *
 * ┌──────────────────┬───────────┬────────────────────────────────────────┐
 * │ Task             │ Provider  │ Why                                    │
 * ├──────────────────┼───────────┼────────────────────────────────────────┤
 * │ intent           │ Ollama    │ Simple yes/no; 8B handles trivially    │
 * │ formatting       │ Ollama    │ Template-filling, no reasoning needed  │
 * │ tos_filter       │ Ollama    │ Binary relevance check, cacheable      │
 * │ summarization    │ Ollama    │ Short summaries, low complexity        │
 * │ classification   │ Groq      │ Multi-label + evidence + severity      │
 * │ legal_reasoning  │ Groq      │ Nuanced clause analysis, high stakes   │
 * │ taxonomy_mapping │ Groq      │ Requires broad world knowledge         │
 * └──────────────────┴───────────┴────────────────────────────────────────┘
 */
const ROUTE_TABLE: Record<TaskType, TaskRoute> = {

  // ─── Lightweight tasks → prefer local Ollama ─────────────────────────

  intent: {
    preferred:    'ollama',
    ollamaModel:  OLLAMA_MODELS.general,       // llama3:8b
    groqModelKey: 'fast',
    cacheable:    false,                        // Intent depends on live input
  },

  formatting: {
    preferred:    'ollama',
    ollamaModel:  OLLAMA_MODELS.general,
    groqModelKey: 'fast',
    cacheable:    true,                         // Same input → same formatting
  },

  tos_filter: {
    preferred:    'ollama',
    ollamaModel:  OLLAMA_MODELS.general,
    groqModelKey: 'fast',
    cacheable:    true,                         // Identical ToS chunks → same verdict
  },

  summarization: {
    preferred:    'ollama',
    ollamaModel:  OLLAMA_MODELS.general,
    groqModelKey: 'fast',
    cacheable:    true,
  },

  // ─── Heavy reasoning tasks → prefer cloud Groq ──────────────────────

  classification: {
    preferred:    'groq',
    ollamaModel:  OLLAMA_MODELS.reasoning,     // deepseek-r1:8b (fallback only)
    groqModelKey: 'reasoning',
    cacheable:    false,                        // Live scans must not be cached
  },

  legal_reasoning: {
    preferred:    'groq',
    ollamaModel:  OLLAMA_MODELS.reasoning,
    groqModelKey: 'reasoning',
    cacheable:    false,
  },

  taxonomy_mapping: {
    preferred:    'groq',
    ollamaModel:  OLLAMA_MODELS.reasoning,
    groqModelKey: 'reasoning',
    cacheable:    false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Route an LLM request through the task-based provider selection system.
 *
 * @param task         – Semantic task type (determines provider + model).
 * @param prompt       – The user-facing prompt text.
 * @param systemPrompt – Optional system instruction override.
 * @param maxTokens    – Maximum tokens to generate.
 * @returns Parsed JSON object from whichever provider handled the request.
 *
 * @example
 *   // In analyseTos.skill.ts, replace:
 *   //   const r = await groqCall(prompt, 'fast', undefined, 64);
 *   // with:
 *   //   const r = await routeLLM('tos_filter', prompt, undefined, 64);
 */
export async function routeLLM(
  task: TaskType,
  prompt: string,
  systemPrompt?: string,
  maxTokens?: number,
): Promise<Record<string, unknown>> {

  const route = ROUTE_TABLE[task];

  // ── Unknown task type → safe degradation to Groq fast ────────────────
  if (!route) {
    console.warn(
      `[LLM Router] Unknown task type "${task}". Falling back to Groq (fast).`,
    );
    return groqCallDirect(prompt, 'fast', systemPrompt, maxTokens);
  }

  // ── Ollama-preferred path ────────────────────────────────────────────
  if (route.preferred === 'ollama') {
    const healthy = await isOllamaHealthy();

    if (healthy) {
      console.log(
        `[LLM Router] "${task}" → Ollama (${route.ollamaModel})`,
      );

      const result = await ollamaCall(
        prompt,
        route.ollamaModel,
        systemPrompt,
        maxTokens,
      );

      // Detect hard Ollama failure (error object) → fall back to Groq
      if (isErrorResponse(result)) {
        console.warn(
          `[LLM Router] Ollama returned error for "${task}": ` +
          `${result.message ?? result.error}. Falling back to Groq.`,
        );
        return groqCallDirect(prompt, route.groqModelKey, systemPrompt, maxTokens);
      }

      return result;
    }

    // Ollama unreachable → transparent fallback
    console.warn(
      `[LLM Router] Ollama unavailable. "${task}" → Groq (${route.groqModelKey}).`,
    );
    return groqCallDirect(prompt, route.groqModelKey, systemPrompt, maxTokens);
  }

  // ── Groq-preferred path (no Ollama attempt) ──────────────────────────
  console.log(
    `[LLM Router] "${task}" → Groq (${route.groqModelKey})`,
  );
  return groqCallDirect(prompt, route.groqModelKey, systemPrompt, maxTokens);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS (for cache.ts and diagnostics)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check whether a task type is safe to cache.
 * Used by the cache layer (cache.ts) to skip caching for live scans.
 */
export function isTaskCacheable(task: TaskType): boolean {
  return ROUTE_TABLE[task]?.cacheable ?? false;
}

/**
 * Retrieve the full route configuration for a task type.
 * Useful for logging, debugging, and test assertions.
 */
export function getRoute(task: TaskType): TaskRoute | undefined {
  return ROUTE_TABLE[task];
}

/**
 * List all registered task types.
 * Useful for CLI tools and health-check dashboards.
 */
export function listTaskTypes(): TaskType[] {
  return Object.keys(ROUTE_TABLE) as TaskType[];
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect whether a provider response is an error descriptor.
 * Both ollamaCall and groqCallDirect return { error: '...', message: '...' }
 * on failure, so we check for that shape.
 */
function isErrorResponse(result: Record<string, unknown>): boolean {
  return (
    typeof result.error === 'string' &&
    (result.error.includes('failure') || result.error.includes('exceeded'))
  );
}
