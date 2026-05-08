import * as fs from "node:fs";
type ResearchJob = {
  pattern: string;
};

import {
  fetchResearch
} from "./research.ts";
let workerRunning = false;
const QUEUE_FILE =
  "data/novel_queue.jsonl";

  function ensureQueueFile() {

  if (!fs.existsSync("data")) {

    fs.mkdirSync(
      "data",
      { recursive: true }
    );

  }

  if (!fs.existsSync(QUEUE_FILE)) {

    fs.writeFileSync(
      QUEUE_FILE,
      ""
    );

  }
}

function readQueue():ResearchJob[] {

  ensureQueueFile();

  const raw =
    fs.readFileSync(
      QUEUE_FILE,
      "utf-8"
    );

  return raw
    .split("\n")
    .filter(Boolean)
    .map(line => {

      try {

        return JSON.parse(line);

      } catch {

        return null;

      }

    })
    .filter(Boolean);
}

function writeQueue(
  jobs: any[]
) {

  const content =
    jobs
      .map(job =>
        JSON.stringify(job)
      )
      .join("\n");

  fs.writeFileSync(
    QUEUE_FILE,
    content
  );
}

export async function startResearchWorker() {

  console.log(
    "[RESEARCH WORKER] Started"
  );

  setInterval(async () => {

    if (workerRunning) {

      return;

    }

    workerRunning = true;

    try {

      const jobs =
        readQueue();

      if (jobs.length === 0) {

        workerRunning = false;

        return;

      }

      // ===================================
      // TAKE FIRST JOB
      // ===================================

      const job =
        jobs.shift();

      writeQueue(jobs);

      const pattern =
        job?.pattern;

      if (!pattern) {

        workerRunning = false;

        return;

      }

      console.log(
        `[RESEARCH WORKER] Processing ${pattern}`
      );

      // ===================================
      // RUN RESEARCH
      // ===================================

      await fetchResearch(
        pattern
      );

      console.log(
        `[RESEARCH WORKER] Completed ${pattern}`
      );

    } catch (err) {

      console.error(
        "[RESEARCH WORKER ERROR]",
        err
      );

    } finally {

      workerRunning = false;

    }

  }, 30000); // every 30 sec
}