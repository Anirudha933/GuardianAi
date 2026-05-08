// guardian.ts

import {
  startHeartbeat
} from "../guardianai/lib/heartbeat.ts";

import {
  startResearchWorker
} from "../guardianai/lib/researchWorker.ts";

console.log(
  "[GuardianAI] Starting background services..."
);

startHeartbeat();

startResearchWorker();

console.log(
  "[GuardianAI] Services online"
);
