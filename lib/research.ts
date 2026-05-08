import axios from "axios";
import * as fs from "node:fs";
import * as path from "node:path";
import { appendFile } from "node:fs/promises";

import { routeLLM } from "./llmRouter.ts";

const DATA_DIR = "data";
const NOVEL_QUEUE = path.join(DATA_DIR, "novel_queue.jsonl");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Extract ArXiv titles from XML
function extractTitles(xml: string): string[] {
  return [...xml.matchAll(/<title>(.*?)<\/title>/gs)]
    .slice(1) // first title is feed title
    .map(match => match[1].trim())
    .filter(Boolean);
}

export async function fetchResearch(patternName: string) {
  ensureDataDir();

  try {
    console.log(`[RESEARCH] Fetching papers for: ${patternName}`);

    const query = encodeURIComponent(
      `dark patterns ${patternName} UI deception`
    );

    const url =
      `http://export.arxiv.org/api/query?search_query=all:${query}&max_results=5`;

    const response = await axios.get(url, {
      timeout: 15000
    });

    const xml = response.data;

    const papers = extractTitles(xml);

    if (papers.length === 0) {
      console.log("[RESEARCH] No papers found");

      return {
        pattern: patternName,
        papers: [],
        summary: "No relevant research papers found.",
        relevance: "LOW"
      };
    }

    // AI summary
    const summaryResult = await routeLLM(
      'summarization',
      `How do these research papers relate to the dark pattern "${patternName}"?

Papers:
${papers.join("; ")}

Return STRICT JSON:
{
  "summary": "...",
  "relevance": "HIGH|MEDIUM|LOW"
}`,
      undefined,
      400
    ) as any;

    // Taxonomy mapping
    const mappingResult = await routeLLM(
      'taxonomy_mapping',
      `Map this potentially novel dark pattern into an existing taxonomy.

Pattern:
${patternName}

Research Summary:
${summaryResult.summary}

Return STRICT JSON:
{
  "matched_category": "...",
  "proposed_name": "...",
  "confidence": 0.0
}`,
      undefined,
      256
    ) as any;

    const payload = {
      timestamp: new Date().toISOString(),
      pattern: patternName,
      papers,
      summary: summaryResult,
      mapping: mappingResult
    };

    // Append to JSONL queue
    await appendFile(
      NOVEL_QUEUE,
      JSON.stringify(payload) + "\n"
    );

    console.log(
      `[RESEARCH] Stored research for ${patternName}`
    );

    return payload;

  } catch (err) {
    console.error("[RESEARCH] Failed:", err);

    return {
      pattern: patternName,
      error: true,
      message: "Research fetch failed"
    };
  }
}