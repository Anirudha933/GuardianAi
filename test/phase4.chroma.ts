import {
  storePattern,
  retrieveSimilar,
  isNovel,
} from '../lib/vectorStore.js';

// store pattern
await storePattern("1", "fake urgency discount timer", {
  url: "https://example.com",
  severity: "8",
  userHash: "user123",
});

// retrieve similar
const similar = await retrieveSimilar('urgency timer fake discount');

console.log("SIMILAR:", similar);

// novelty check
const novel1 = await isNovel("completely new pattern");
const novel2 = await isNovel("fake urgency discount timer");

console.log("NOVEL:", novel1, novel2);