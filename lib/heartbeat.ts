// lib/heartbeat.ts

import * as fs from "node:fs";

import {
  getAllUsers,
  getWatchlist
} from "./watchlist.ts";

const RESULTS_FILE = "data/results.json";

// Prevent overlapping scans
let heartbeatRunning = false;

// =========================================
// ENSURE RESULTS FILE EXISTS
// =========================================

function ensureResultsFile() {

  // Ensure data directory exists
  if (!fs.existsSync("data")) {
    fs.mkdirSync("data", {
      recursive: true
    });
  }

  // Ensure results file exists
  if (!fs.existsSync(RESULTS_FILE)) {

    fs.writeFileSync(
      RESULTS_FILE,
      JSON.stringify({}, null, 2)
    );

  }
}

// =========================================
// LOAD PREVIOUS RESULTS
// =========================================

function getResults() {

  ensureResultsFile();

  try {

    return JSON.parse(
      fs.readFileSync(
        RESULTS_FILE,
        "utf-8"
      )
    );

  } catch {

    return {};

  }
}

// =========================================
// SAVE RESULTS
// =========================================

function saveResults(data: any) {

  fs.writeFileSync(
    RESULTS_FILE,
    JSON.stringify(data, null, 2)
  );
}

// =========================================
// DIFF ENGINE
// =========================================

function isDifferent(
  oldVal: any,
  newVal: any
) {

  // First scan
  if (!oldVal) {
    return true;
  }

  try {

    const oldPatterns =
      oldVal?.detectResult?.patterns || [];

    const newPatterns =
      newVal?.detectResult?.patterns || [];

    // Map old patterns
    const oldMap =
      new Map<string, number>();

    for (const pattern of oldPatterns) {
      if (pattern?.type == null) {
        continue;
      }

      const severity =
        Number(pattern.severity);

      oldMap.set(
        String(pattern.type),
        Number.isNaN(severity) ?
          0 :
          severity
      );
    }

    for (const pattern of newPatterns) {

      // ===================================
      // NEW PATTERN TYPE
      // ===================================

      if (!oldMap.has(pattern.type)) {

        return true;

      }

      // ===================================
      // SEVERITY CHANGE >= 2
      // ===================================

      const oldSeverity =
        oldMap.get(
          String(pattern.type)
        ) ?? 0;

      if (

        Math.abs(
          oldSeverity -
          Number(pattern.severity)
        ) >= 2

      ) {

        return true;

      }
    }

    return false;

  } catch {

    return true;

  }
}

// =========================================
// RUN PIPELINE
// =========================================

async function runPipeline(
  url: string,
  userHash: string
) {

  const { default: run } =
    await import("./run.ts");

  return await run(
    url,
    userHash
  );
}

// =========================================
// TELEGRAM NOTIFIER PLACEHOLDER
// =========================================

async function sendTelegramDiff(
  userHash: string,
  url: string,
  result: any
) {

  const patterns =
    result?.detectResult?.summary || [];

  console.log(
    `[TELEGRAM] ${userHash} → ${url}`
  );

  console.log(
    `[TELEGRAM] Patterns:`,
    patterns
  );
}

// =========================================
// MAIN HEARTBEAT
// =========================================

export async function startHeartbeat() {

  console.log(
    "[HEARTBEAT] Started"
  );

  setInterval(async () => {

    // =====================================
    // PREVENT OVERLAPPING RUNS
    // =====================================

    if (heartbeatRunning) {

      console.log(
        "[HEARTBEAT] Previous scan still running"
      );

      return;

    }

    heartbeatRunning = true;

    console.log(
      "\n[HEARTBEAT] Weekly scan started"
    );

    try {

      // ===================================
      // LOAD USERS + OLD RESULTS
      // ===================================

      const users =
        getAllUsers();

      const oldResults =
        getResults();

      const newResults: any = {};

      // ===================================
      // SCAN EACH USER
      // ===================================

      for (const userHash of users) {

        console.log(
          `[HEARTBEAT] User: ${userHash}`
        );

        const urls =
          getWatchlist(userHash);

        newResults[userHash] = {};

        // =================================
        // SCAN EACH URL
        // =================================

        for (const url of urls) {

          console.log(
            `[HEARTBEAT] Scanning ${url}`
          );

          try {

            const result =
              await runPipeline(
                url,
                userHash
              );

            // Save new result
            newResults[userHash][url] =
              result;

            // Get previous result
            const oldResult =
              oldResults?.[userHash]?.[url];

            // =============================
            // DIFF DETECTION
            // =============================

            if (
              isDifferent(
                oldResult,
                result
              )
            ) {

              console.log(
                `[DIFF] Change detected on ${url}`
              );

              // Telegram alert
              await sendTelegramDiff(
                userHash,
                url,
                result
              );

            } else {

              console.log(
                `[HEARTBEAT] No new issues detected on ${url}`
              );

            }

          } catch (scanErr) {

            console.error(
              `[SCAN ERROR] ${url}`,
              scanErr
            );

          }
        }
      }

      // ===================================
      // SAVE UPDATED RESULTS
      // ===================================

      saveResults(newResults);

      console.log(
        "[HEARTBEAT] Scan cycle completed"
      );

    } catch (err) {

      console.error(
        "[HEARTBEAT ERROR]",
        err
      );

    } finally {

      heartbeatRunning = false;

    }

  }, 60000); // demo mode
}