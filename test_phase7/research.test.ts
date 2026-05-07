import { fetchResearch } from "../services/research.ts";

export async function testResearch() {
  console.log("\n--- Research Test ---");

  const result = await fetchResearch("dark patterns");

  console.log("Research Output:");
  console.log(result.slice(0, 200));
}