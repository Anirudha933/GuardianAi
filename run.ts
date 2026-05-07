import scrape from './skills/scrape.skill.ts';
import analyseTos from './skills/analyseTos.skill.ts';
import detectPatterns from './skills/detectPatterns.skill.ts';
import generateResponse from './skills/generateResponse.skill.ts';

const url = process.argv[2];

if (!url) {
  console.log("Usage: ts-node run.ts <url>");
  process.exit(1);
}

async function main() {
  console.log("Step 1: Scraping...");
  const scrapeResult = await scrape(url);

  console.log("Step 2: Analysing ToS...");
  const tosResult = await analyseTos(scrapeResult.tos);

  console.log("Step 3: Detecting patterns...");
  const detectResult = await detectPatterns(
    scrapeResult.dom,
    tosResult,
    "test_user"
  );

  console.log("Step 4: Generating response...");
  const response = await generateResponse(
    url,
    detectResult,
    tosResult
  );

  console.log("\nFINAL OUTPUT:\n");
  console.log(response);
}

main();