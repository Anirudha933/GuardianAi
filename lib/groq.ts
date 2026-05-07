import Groq from 'groq-sdk';
import { config } from 'dotenv';
config();

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODELS = {
  fast:      'llama-3.1-8b-instant',
  reasoning: 'llama-3.3-70b-versatile',
} as const;

export async function groqCall(
  prompt: string,
  modelKey: keyof typeof MODELS = 'fast',
  systemPrompt = 'Respond only in valid JSON.',
  maxTokens = 1024,
): Promise<Record<string, unknown>> {
  let attempt = 0;
  while (attempt < 3) {
    try {
      const res = await client.chat.completions.create({
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

function isRateLimitError(err: any): boolean {
  return (
    err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.response?.status === 429 ||
    err?.error?.status === 429
  );
}
