import { ChromaClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';

type PatternMeta = {
  url: string;
  severity: string;
  userHash: string;
};

type SimilarResult = {
  text: string;
  distance: number;
};

function getChromaConfig() {
  const path =
    process.env.CHROMA_PATH;

  if (path) {
    const url = new URL(path);
    const port =
      url.port ?
        Number(url.port) :
        url.protocol === 'https:' ?
          443 :
          80;

    return {
      host: url.hostname,
      port,
      ssl: url.protocol === 'https:',
    };
  }

  const host =
    process.env.CHROMA_HOST ||
    'localhost';
  const port =
    process.env.CHROMA_PORT ?
      Number(process.env.CHROMA_PORT) :
      8000;
  const ssl =
    process.env.CHROMA_SSL === 'true';

  return { host, port, ssl };
}

const client = new ChromaClient(
  getChromaConfig()
);

const COLLECTION = 'guardian_patterns';

// =========================================
// GET COLLECTION
// =========================================

async function getCollection() {
  return await client.getOrCreateCollection({
    name: COLLECTION,
    metadata: {
      'hnsw:space': 'cosine',
    },
    embeddingFunction:
      new DefaultEmbeddingFunction(),
  });
}

// =========================================
// STORE PATTERN
// =========================================

export async function storePattern(
  id: string,
  text: string,
  metadata: PatternMeta
): Promise<void> {

  const collection =
    await getCollection();

  await collection.upsert({
    ids: [id],
    documents: [text],
    metadatas: [metadata],
  });

  console.log(
    '[vectorStore] stored pattern:',
    id
  );
}

// =========================================
// RETRIEVE SIMILAR PATTERNS
// =========================================

export async function retrieveSimilar(
  text: string,
  k: number = 5
): Promise<SimilarResult[]> {

  const collection =
    await getCollection();

  const results =
    await collection.query({
      queryTexts: [text],
      nResults: k,
    });

  const rawDocs =
    results.documents?.[0] ?? [];

  const rawDistances =
    results.distances?.[0] ?? [];

  const formatted: SimilarResult[] =
    rawDocs
      .map((doc, i) => {
        if (doc == null) {
          return null;
        }

        const distance =
          rawDistances[i];

        return {
          text: doc,
          distance:
            distance ?? 1,
        };
      })
      .filter(
        (
          item
        ): item is SimilarResult =>
          item !== null
      );

  console.log(
    '[vectorStore] retrieved',
    formatted.length,
    'patterns'
  );

  return formatted;
}

// =========================================
// NOVELTY DETECTION
// =========================================

export async function isNovel(
  text: string,
  threshold: number = 0.75
): Promise<boolean> {

  const collection =
    await getCollection();

  const count =
    await collection.count();

  if (count === 0) {
    return true;
  }

  const results =
    await collection.query({
      queryTexts: [text],
      nResults: 1,
    });

  const distance:
    | number
    | undefined =
      results.distances?.[0]?.[0] ??
      undefined;

  console.log(
    '[vectorStore] closest distance:',
    distance
  );

  if (distance === undefined) {
    return true;
  }

  return distance > threshold;
}