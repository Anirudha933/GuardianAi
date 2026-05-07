import { startHeartbeat } from "../services/heartbeat.ts";

export function testHeartbeat() {
  console.log("\n--- Heartbeat Test ---");

  console.log("Starting heartbeat (will run automatically every cycle)...");

  startHeartbeat();
}