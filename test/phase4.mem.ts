import { appendScan, loadMemory } from '../lib/memory.js';

await appendScan("user123", "https://example.com", ["urgency_manipulation"]);

const mem = await loadMemory("user123");

console.log(mem);