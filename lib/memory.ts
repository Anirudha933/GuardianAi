// lib/memory.ts

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ✅ FIX: use local relative path for VPS
const MEMORY_DIR = process.env.MEMORY_PATH ?? './data/memory';

export async function loadMemory(userHash: string) {
  await mkdir(MEMORY_DIR, { recursive: true });

  const file = path.join(MEMORY_DIR, `${userHash}.md`);

  if (!existsSync(file)) {
    return { history: [], watchlist: [], preferences: {} };
  }

  const raw = await readFile(file, 'utf-8');
  return parseMemoryMd(raw);
}

export async function appendScan(
  userHash: string,
  url: string,
  summary: string[]
) {
  await mkdir(MEMORY_DIR, { recursive: true }); // ✅ ensure folder exists

  const file = path.join(MEMORY_DIR, `${userHash}.md`);
  const ts = new Date().toISOString();

  const entry = `
## Scan ${ts}
URL: ${url}
Findings: ${summary.join(', ')}
`;

  await writeFile(file, entry, { flag: 'a' });
}

export async function addToWatchlist(userHash: string, url: string) {
  await mkdir(MEMORY_DIR, { recursive: true }); // ✅ ensure folder exists

  const file = path.join(MEMORY_DIR, `${userHash}.md`);

  await writeFile(file, `\n## Watchlist\n- ${url}\n`, {
    flag: 'a',
  });
}

function parseMemoryMd(raw: string) {
  const history: string[] = [];
  const watchlist: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith('URL:')) {
      history.push(line.replace('URL: ', ''));
    }

    if (line.startsWith('- http')) {
      watchlist.push(line.replace('- ', ''));
    }
  }

  return { history, watchlist, preferences: {} };
}