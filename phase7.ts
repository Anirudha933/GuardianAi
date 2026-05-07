import { addWatch } from "./services/watchlist.ts";
import { startHeartbeat } from "./services/heartbeat.ts";

async function main() {
  console.log("Starting Phase 7...");

  addWatch("https://example.com");
  addWatch("https://wikipedia.org");

  startHeartbeat();
}

main();