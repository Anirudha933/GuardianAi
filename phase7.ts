import { addWatch } from "./services/watchlist.ts";

import { testWatchlist } from "./test_phase7/watchlist.test.ts";
import { testResearch } from "./test_phase7/research.test.ts";
import { testHeartbeat } from "./test_phase7/heartbeat.test.ts";

async function main() {
  console.log("Starting Phase 7 Tests...");

  // 🟢 Test Watchlist
  testWatchlist();

  // 🟢 Add real URLs for heartbeat
  addWatch("https://example.com");
  addWatch("https://wikipedia.org");

  // 🟢 Test Research
  await testResearch();

  // 🟢 Test Heartbeat (runs continuously)
  testHeartbeat();
}

main();