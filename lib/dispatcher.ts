import { appendScan } from './memory.js';
import { hashPhone, isRateLimited } from './security.js';
import analyseTos from '../skills/analyseTos.skill.js';
import detectPatterns from '../skills/detectPatterns.skill.js';
import generateResponse from '../skills/generateResponse.skill.js';
import scrape, { validateScrapeUrl } from '../skills/scrape.skill.js';

type GuardianMessageInput = {
  userId: string;
  text: string;
};

type GuardianMessageResult = {
  userHash: string;
  reply: string;
  rateLimited: boolean;
};

export async function handleGuardianMessage(
  input: GuardianMessageInput
): Promise<GuardianMessageResult> {
  const userHash = hashPhone(input.userId);

  if (isRateLimited(userHash)) {
    return {
      userHash,
      rateLimited: true,
      reply: 'You are sending requests too quickly. Please wait a minute and try again.',
    };
  }

  const url = extractUrl(input.text);

  if (!url) {
    return {
      userHash,
      rateLimited: false,
      reply: 'Send: Scan https://example.com',
    };
  }

  let safeUrl: string;
  try {
    safeUrl = await validateScrapeUrl(url);
  } catch {
    return {
      userHash,
      rateLimited: false,
      reply: 'Could not scan that URL. Please send a valid public http or https URL.',
    };
  }

  try {
    const scraped = await scrape(safeUrl);
    const tosResult = await analyseTos(scraped.tos);
    const patterns = await detectPatterns(scraped.dom, tosResult, userHash);
    const reply = await generateResponse(safeUrl, patterns, tosResult);

    await appendScan(userHash, safeUrl, patterns.summary ?? []);

    return {
      userHash,
      rateLimited: false,
      reply,
    };
  } catch (err) {
    console.error('GuardianAI dispatcher failed:', err);

    return {
      userHash,
      rateLimited: false,
      reply: 'Something went wrong while scanning this URL. Please try again later.',
    };
  }
}

export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match?.[0] ?? null;
}
