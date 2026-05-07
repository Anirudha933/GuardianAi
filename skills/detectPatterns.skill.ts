// skills/detectPatterns.skill.ts

import { groqCall } from '../lib/groq.js';
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
    clauses: Array<{ text: string; severity: number }>;
    highRisk: Array<{ text: string }>;
  },
  userHash: string
) {

  // Pi Engine passes URL as first token of DOM
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
              `Pattern ${i + 1}:\n${s.text}\nSimilarity Distance: ${s.distance.toFixed(2)}`
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

    r = await groqCall(
      `You are GuardianAI. Analyse this website for dark patterns.

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

Return ONLY JSON:

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
      'reasoning',
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
  // HANDLE RESPONSE FORMATS
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
  // STORE PATTERNS + NOVEL DETECTION
  // =========================================

  for (const p of patterns) {

    try {

      const patternText =
        `${p.type}: ${p.evidence}`;
const id = randomUUID();

// Check novelty BEFORE storing
const novel =
  await isNovel(patternText);

// Store only if novel
if (novel) {

  await storePattern(
    id,
    patternText,
    {
      url,
      severity: String(p.severity),
      userHash,
    }
  );

}

      // Novel detection

      console.log(
        '[detectPatterns] Novel:',
        novel
      );

      // Queue async research
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
      patterns.map(p => p.type),

  };

}