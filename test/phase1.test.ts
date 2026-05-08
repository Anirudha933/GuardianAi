// test/phase1.test.ts
import { groqCall } from '../lib/groq.js';

console.log("GROQ key configured:", Boolean(process.env.GROQ_API_KEY));

(async () => {
  try {
    const r8b = await groqCall('Return JSON: {"ping": true}', 'fast');
    console.log("8b RESULT:", r8b);

    const r70b = await groqCall('Return JSON: {"ping": true}', 'reasoning');
    console.log("70b RESULT:", r70b);

  } catch (e: any) {
    console.error("CAUGHT ERROR:", e);
    console.error("ERROR STRING:", String(e));
    console.error("STACK:", e?.stack);
  }
})();
