// skills/detectPatterns.skill.ts

import { groqCall } from '../lib/groq.js';
import { retrieveSimilar, storePattern, isNovel } from '../lib/vectorStore';
import { writeNovelQueue } from './novelQueue';
import { randomUUID } from 'crypto';

export default async function detectPatterns(
  dom: string,
  tosResult: {
    clauses: Array<{ text: string; severity: number }>;
    highRisk: Array<{ text: string }>;
  },
  userHash: string
) {
  const url = dom.slice(0, 100);

  // 🔹 Retrieve similar patterns (RAG)
  let similar: any[] = [];
  try {
    similar = await retrieveSimilar(dom.slice(0, 200), 5);
  } catch (err) {
    console.warn("Vector retrieval failed:", err);
  }

  const ragContext =
    similar.length > 0
      ? 'Similar past patterns:\n' +
        similar
          .map(
            (s: any) =>
              `- ${s.text} (dist: ${s.distance?.toFixed?.(2) ?? "?"})`
          )
          .join('\n')
      : 'No prior patterns in knowledge base.';

  // 🔹 LLM call
  let r: any = {};
  try {
    r = await groqCall(
      `You are GuardianAI. Analyse this website for dark patterns.
SOUL TAXONOMY: roach_motel | trick_questions | hidden_costs | confirmshaming |
misdirection | forced_continuity | privacy_zuckering | urgency_manipulation |
disguised_ads | bait_and_switch | social_proof_manipulation

RAG CONTEXT:
${ragContext}

DOM (first 3000 chars):
${dom.slice(0, 3000)}

HIGH-RISK ToS CLAUSES:
${JSON.stringify(tosResult.highRisk.slice(0, 5))}

Return ONLY JSON:
{"patterns":[{"type":"...","evidence":"...","severity":1-10,"location":"UI|ToS"}],"overall_risk":"HIGH|MEDIUM|LOW|NONE"}`,
      'reasoning',
      undefined,
      1500
    );
  } catch (err) {
    console.error("Pattern detection failed:", err);
    return { patterns: [], overall_risk: 'NONE', summary: [] };
  }

  // 🔹 Handle multiple response formats
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

  // 🔹 Store patterns safely
  for (const p of patterns) {
    try {
      const id = randomUUID();

      await storePattern(
        id,
        `${p.type}: ${p.evidence}`,
        {
          url,
          severity: String(p.severity),
          userHash,
        }
      );

      const novel = await isNovel(`${p.type}: ${p.evidence}`);
      if (novel) {
        await writeNovelQueue(p.type);
      }

    } catch (err) {
      console.warn("Pattern storage failed:", err);
      continue;
    }
  }

  return {
    patterns,
    overall_risk: r?.overall_risk ?? 'NONE',
    summary: patterns.map(p => p.type),
  };
}