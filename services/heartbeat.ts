import * as fs from "fs";
import { getWatchlist } from "./watchlist.ts";
import { fetchResearch } from "./research.ts";

const RESULTS_FILE = "memory/results.json";

function getResults() {
  return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
}

function saveResults(data: any) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2));
}

// ✅ FINAL: compare ONLY patterns (stable)
function isDifferent(oldVal: any, newVal: any) {
  if (!oldVal) return true; // first run

  try {
    const oldPatterns = oldVal?.detectResult?.patterns || [];
    const newPatterns = newVal?.detectResult?.patterns || [];

    return oldPatterns.length !== newPatterns.length;
  } catch {
    return true;
  }
}

// IMPORTANT: this runs your pipeline
async function runPipeline(url: string) {
  const { default: run } = await import("../run.ts");
  return await run(url);
}

export async function startHeartbeat() {
  console.log("Heartbeat started...");

  setInterval(async () => {
    console.log("\n--- Weekly Scan ---");

    const urls = getWatchlist();
    const oldResults = getResults();
    const newResults: any = {};

    for (const url of urls) {
      console.log("Scanning:", url);

      const result = await runPipeline(url);
      newResults[url] = result;

      if (isDifferent(oldResults[url], result)) {
        console.log("CHANGE DETECTED:", url);

        const research = await fetchResearch("dark pattern");
        console.log("Research:", research.slice(0, 100));
      }
    }

    saveResults(newResults);

  }, 60000); // 60 sec demo
}