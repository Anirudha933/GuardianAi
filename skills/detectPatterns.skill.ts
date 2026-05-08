// skills/detectPatterns.skill.ts

import { routeLLM } from '../lib/llmRouter.js';

import {
  retrieveSimilar,
  storePattern,
  isNovel
} from '../lib/vectorStore.js';

import { writeNovelQueue } from './novelQueue.js';

import { randomUUID } from 'crypto';

export default async function detectPatterns(
  dom: string,
  tosResult: {
    clauses: Array<{
      text: string;
      severity: number;
    }>;
    highRisk: Array<{
      text: string;
    }>;
  },
  userHash: string
) {

  // =========================================
  // BASIC URL EXTRACTION
  // =========================================

  const url = dom.slice(0, 100);

  // =========================================
  // RAG RETRIEVAL
  // =========================================

  let similar: Array<{
    text: string;
    distance: number;
  }> = [];

  try {

    similar = await retrieveSimilar(
      dom.slice(0, 200),
      5
    );

  } catch (err) {

    console.warn(
      '[detectPatterns] Vector retrieval failed:',
      err
    );

  }

  // =========================================
  // BUILD RAG CONTEXT
  // =========================================

  const ragContext =
    similar.length > 0
      ? similar
          .map(
            (s, i) =>
              `Pattern ${i + 1}:
${s.text}
Similarity Distance: ${s.distance.toFixed(2)}`
          )
          .join('\n\n')
      : 'No prior patterns in knowledge base.';

  // =========================================
  // PHASE 6 VALIDATION LOG
  // =========================================

  console.log(
    '[detectPatterns] RAG context:',
    similar.length > 0
      ? 'loaded'
      : 'none'
  );

  // =========================================
  // GROQ REASONING CALL
  // =========================================

  let r: any = {};

  try {

    r = await routeLLM(
      'classification',
`You are GuardianAI.

Analyse this website for manipulative UX patterns,
dark patterns, deceptive flows, hidden coercion,
or exploitative interaction design.

SOUL TAXONOMY:
roach_motel |
trick_questions |
hidden_costs |
confirmshaming |
misdirection |
forced_continuity |
privacy_zuckering |
urgency_manipulation |
disguised_ads |
bait_and_switch |
social_proof_manipulation

RAG CONTEXT (most similar past patterns):
${ragContext}

DOM (first 3000 chars):
${dom.slice(0, 3000)}

HIGH-RISK ToS CLAUSES:
${JSON.stringify(
  tosResult.highRisk.slice(0, 5)
)}

IMPORTANT RULES:

- Only report patterns with strong evidence.
- Avoid speculative classifications.
- If no meaningful dark patterns exist,
  return:

{
  "patterns": [],
  "overall_risk": "NONE"
}

Return ONLY valid JSON.

Required JSON schema:

{
  "patterns":[
    {
      "type":"...",
      "evidence":"...",
      "severity":1-10,
      "location":"UI|ToS"
    }
  ],
  "overall_risk":"HIGH|MEDIUM|LOW|NONE"
}`,
      undefined,
      1500
    );

  } catch (err) {

    console.error(
      '[detectPatterns] Pattern detection failed:',
      err
    );

    return {
      patterns: [],
      overall_risk: 'NONE',
      summary: [],
    };

  }

  // =========================================
  // NORMALIZE RESPONSE FORMAT
  // =========================================

  let patterns: Array<{
    type: string;
    evidence: string;
    severity: number;
    location: string;
  }> = [];

  if (Array.isArray(r)) {

    patterns = r;

  } else if (r?.patterns) {

    patterns = r.patterns;

  }

  // =========================================
  // SAFETY FILTER
  // Prevent hallucinated / weak patterns
  // =========================================

  patterns = patterns.filter(p => {

    if (!p?.type) {
      return false;
    }

    if (!p?.evidence) {
      return false;
    }

    if (
      typeof p.severity !== 'number'
    ) {
      return false;
    }

    // reject weak hallucinated evidence
    if (
      p.evidence.length < 10
    ) {
      return false;
    }

    return true;

  });

  // =========================================
  // NO-PATTERN FAST EXIT
  // =========================================

  if (patterns.length === 0) {

    console.log(
      '[detectPatterns] No meaningful patterns detected'
    );

    return {

      patterns: [],

      overall_risk:
        r?.overall_risk ?? 'NONE',

      summary: [],

    };

  }

  // =========================================
  // STORE PATTERNS + NOVEL DETECTION
  // =========================================

  for (const p of patterns) {

    try {

      const patternText =
        `${p.type}: ${p.evidence}`;

      const id = randomUUID();

      // =====================================
      // CHECK NOVELTY FIRST
      // =====================================

      const novel =
        await isNovel(patternText);

      console.log(
        '[detectPatterns] Novel:',
        novel
      );

      // =====================================
      // STORE ONLY IF NOVEL
      // =====================================

      if (novel) {

        await storePattern(
          id,
          patternText,
          {
            url,
            severity: String(
              p.severity
            ),
            userHash,
          }
        );

        console.log(
          '[detectPatterns] Stored novel pattern:',
          p.type
        );

      }

      // =====================================
      // ASYNC RESEARCH QUEUE
      // =====================================

      if (novel) {

        await writeNovelQueue(
          p.type
        );

        console.log(
          '[detectPatterns] Added to novel queue:',
          p.type
        );

      }

    } catch (err) {

      console.warn(
        '[detectPatterns] Pattern storage failed:',
        err
      );

      continue;

    }

  }

  // =========================================
  // FINAL RESPONSE
  // =========================================

  return {

    patterns,

    overall_risk:
      r?.overall_risk ?? 'NONE',

    summary:
      patterns.map(
        p => p.type
      ),

  };

}