// skills/generateResponse.skill.ts

import { groqCall } from '../lib/groq.ts';

export default async function generateResponse(
  url: string,
  patterns: {
    summary?: string[];
    overall_risk?: string;
  },
  tosResult: {
    highRisk: Array<{ text: string }>;
  }
) {
  try {
    const tosText = tosResult.highRisk
      .slice(0, 2)
      .map(c => c.text.slice(0, 60))
      .join(' | '); // ✅ FIX: clean string instead of array

   const r = await groqCall(
  `Generate a Telegram dark pattern report.

STRICT RULES:
- Output MUST be plain text only
- DO NOT use markdown, asterisks, or formatting symbols
- Use ONLY simple text
- Start with one of: 🔴 HIGH RISK, 🟡 MEDIUM RISK, 🟢 LOW RISK, ⚪ NO RISK
- Then list patterns as:
  • pattern_name
- Then one line: High-risk ToS: ...
- Then one line: Recommendation: ...
- Max 1000 characters
- Patterns must be lowercase snake_case (e.g., urgency_manipulation).

URL: ${url}
Overall risk: ${patterns.overall_risk ?? 'NONE'}
Patterns: ${JSON.stringify(patterns.summary ?? [])}
High-risk ToS: ${tosText}

Return ONLY JSON:
{"message":"..."}`,
  'fast',
  undefined,
  512
);
    // 🔹 Handle multiple response formats
    if (typeof r === 'string') return r;

    if (r?.message) return r.message;

    if (r?.text) return r.text;

    return `Scan complete for ${url}. Risk: ${patterns.overall_risk ?? 'NONE'}`;

  } catch (err) {
    console.error("Response generation failed:", err);

    return `⚠️ Failed to generate report for ${url}.`;
  }
}