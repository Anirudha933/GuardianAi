// lib/vectorStore.ts

type Pattern = {
  id: string;
  text: string;
  metadata: {
    url: string;
    severity: string;
    userHash: string;
  };
};

type SimilarResult = {
  text: string;
  distance: number;
};

const patterns: Pattern[] = []; // in-memory store

// 🔹 Retrieve similar patterns
export async function retrieveSimilar(
  text: string,
  k: number = 5
): Promise<SimilarResult[]> {
  return patterns
    .map(p => ({
      text: p.text,
      distance: similarity(text, p.text),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);
}

// 🔹 Store new pattern
export async function storePattern(
  id: string,
  text: string,
  metadata: Pattern['metadata']
): Promise<void> {
  patterns.push({
    id,
    text,
    metadata,
  });
}

// 🔹 Check if pattern is novel
export async function isNovel(text: string): Promise<boolean> {
  const exists = patterns.some(p => p.text === text);
  return !exists;
}

// 🔹 Simple similarity function
function similarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\s+/));
  const bWords = new Set(b.toLowerCase().split(/\s+/));

  const intersection = [...aWords].filter(x => bWords.has(x)).length;
  const union = new Set([...aWords, ...bWords]).size;

  return union === 0 ? 1 : 1 - intersection / union;
}