// skills/analyseTos.skill.ts

import { groqCall } from '../lib/groq.ts';

// Chunk text with overlap
function chunk(text: string, size = 512, overlap = 64): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];

  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + size).join(' '));
    i += size - overlap;
  }

  return chunks;
}

export default async function analyseTos(tosText: string) {
  if (!tosText || !tosText.trim()) {
    return { clauses: [], highRisk: [] };
  }

  const chunks = chunk(tosText);
  const relevant: string[] = [];

  // 🔹 Step 1: Filter relevant chunks (fast model)
  for (const c of chunks) {
    try {
      const r = await groqCall(
        `Does this ToS excerpt contain payment, renewal, consent, arbitration, or data sharing terms?
Reply ONLY JSON: {"relevant": true|false}.
Text: ${c.slice(0, 600)}`,
        'fast',
        undefined,
        64
      ) as { 
        relevant?: boolean;
        payment?: boolean;
        renewal?: boolean;
        consent?: boolean;
        arbitration?: boolean;
        "data sharing"?: boolean;
       };
      console.log("RAW FILTER RESPONSE:", r);
      const isRelevant =
        r?.relevant === true ||
        r?.payment === true ||
        r?.renewal === true ||
        r?.consent === true ||
        r?.arbitration === true ||
        r?.['data sharing'] === true;

if (isRelevant) {
  relevant.push(c);
}

    } catch (err) {
      console.warn("Filter step failed:", err);
      continue;
    }
  }

  const clauses: Array<{
    text: string;
    type: string;
    severity: number;
  }> = [];

  // 🔹 Step 2: Deep analysis (reasoning model)
  for (const c of relevant) {
    try {
            const r = await groqCall(
            `Extract manipulative clauses from this ToS excerpt.
            Return ONLY JSON:
            {"clauses":[{"text":"...","type":"auto_renewal|forced_arbitration|data_sharing|buried_opt_out|other","severity":1-10}]}
            If nothing suspicious, return {"clauses":[]}.
            Text: ${c}`,
            'reasoning',
            undefined,
            1024
            ) as {
            clauses?: Array<{
                text: string;
                type: string;
                severity: number;
            }>;
            };

            console.log("ANALYSIS RESPONSE:", r); // 👈 ADD THIS
      if (Array.isArray(r)) {
        clauses.push(...r);
        } else if (r?.clauses?.length) {
        clauses.push(...r.clauses);
        }

    } catch (err) {
      console.warn("Deep analysis failed:", err);
      continue;
    }
  }

  // 🔹 Deduplicate clauses by text
const uniqueClauses = Array.from(
  new Map(clauses.map(c => [c.text, c])).values()
);

// 🔹 Filter high risk
const highRisk = uniqueClauses.filter(c => c.severity >= 7);

return { clauses: uniqueClauses, highRisk };
}