// lib/run.ts

import scrape from "../skills/scrape.skill.ts";
import analyseTos from "../skills/analyseTos.skill.ts";
import detectPatterns from "../skills/detectPatterns.skill.ts";
import generateResponse from "../skills/generateResponse.skill.ts";

export default async function run(
  url: string,
  userHash: string = "system"
) {

  console.log(
    `\n[PIPELINE] Starting scan for ${url}`
  );

  try {

    // =====================================
    // STEP 1 — SCRAPE
    // =====================================

    const scrapeResult =
      await scrape(url);

    console.log(
      `[PIPELINE] Scrape completed via ${scrapeResult.source}`
    );

    // =====================================
    // STEP 2 — ANALYSE TOS
    // =====================================

    const tosResult =
      await analyseTos(
        scrapeResult.tos ||
        scrapeResult.dom ||
        ""
      );

    console.log(
      `[PIPELINE] ToS analysis completed`
    );

    // =====================================
    // STEP 3 — DETECT PATTERNS
    // =====================================

    const detectResult =
      await detectPatterns(
        scrapeResult.dom,
        tosResult,
        userHash
      );

    console.log(
      `[PIPELINE] Pattern detection completed`
    );

    // =====================================
    // STEP 4 — GENERATE RESPONSE
    // =====================================

    const response =
      await generateResponse(
        url,
        detectResult,
        tosResult
      );

    console.log(
      `[PIPELINE] Response generation completed`
    );

    // =====================================
    // FINAL PIPELINE RESULT
    // =====================================

    return {

      url,

      timestamp:
        new Date().toISOString(),

      scrapeResult,

      tosResult,

      detectResult,

      response,

    };

  } catch (err) {

    console.error(
      `[PIPELINE ERROR] ${url}`,
      err
    );

    return {

      url,

      error: true,

      message:
        err instanceof Error
          ? err.message
          : "Unknown pipeline error"

    };

  }
}