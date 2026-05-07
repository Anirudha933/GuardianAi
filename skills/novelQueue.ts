// skills/novelQueue.ts

import { appendFile } from 'fs/promises';

export async function writeNovelQueue(patternName: string) {
  const entry =
    JSON.stringify({
      pattern: patternName,
      ts: new Date().toISOString(),
    }) + '\n';

  await appendFile('./data/novel_queue.jsonl', entry);
}