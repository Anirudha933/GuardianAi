// lib/dispatcher.ts

import { appendScan } from './memory.ts';

import {
  hashPhone,
  isRateLimited
} from './security.ts';

import {
  addWatch,
  removeWatch,
  getWatchlist,
  setTelegramChatId
} from './watchlist.ts';
import run from './run.ts';

import {
  validateScrapeUrl
} from '../skills/scrape.skill.ts';

// =========================================
// TYPES
// =========================================

type GuardianMessageInput = {
  userId: string;
  chatId?: number;
  text: string;
};

type GuardianMessageResult = {
  userHash: string;
  reply: string;
  rateLimited: boolean;
};

// =========================================
// MAIN DISPATCHER
// =========================================

export async function handleGuardianMessage(
  input: GuardianMessageInput
): Promise<GuardianMessageResult> {

  // =======================================
  // USER HASH
  // =======================================

  const userHash =
    hashPhone(input.userId);

    if (
    input.chatId != null
  ) {

    setTelegramChatId(
      userHash,
      input.chatId
    );

  }
  // =======================================
  // RATE LIMIT
  // =======================================

  if (
    isRateLimited(userHash)
  ) {

    return {

      userHash,

      rateLimited: true,

      reply:
        'You are sending requests too quickly. Please wait a minute and try again.',

    };

  }

  // =======================================
  // CLEAN INPUT
  // =======================================

  const clean =
    input.text.trim();

  const lower =
    clean.toLowerCase();

  // =======================================
  // HELP COMMAND
  // =======================================

  if (
    lower === 'help'
  ) {

    return {

      userHash,

      rateLimited: false,

      reply:
`GuardianAI Commands

Send a URL directly to scan it.

watch <url>
unwatch <url>
watchlist
help`,

    };

  }

  // =======================================
  // WATCH COMMAND
  // =======================================

  if (
    lower.startsWith('watch ')
  ) {

    const rawUrl =
      clean.replace(
        /^watch\s+/i,
        ''
      ).trim();

    try {

      const safeUrl =
        await validateScrapeUrl(
          rawUrl
        );

      addWatch(
        userHash,
        safeUrl
      );

      return {

        userHash,

        rateLimited: false,

        reply:
          `✅ Added to watchlist:\n${safeUrl}`,

      };

    } catch {

      return {

        userHash,

        rateLimited: false,

        reply:
          'Invalid URL for watchlist.',

      };

    }
  }

  // =======================================
  // UNWATCH COMMAND
  // =======================================

  if (
    lower.startsWith('unwatch ')
  ) {

    const rawUrl =
      clean.replace(
        /^unwatch\s+/i,
        ''
      ).trim();

    try {

      const safeUrl =
        await validateScrapeUrl(
          rawUrl
        );

      removeWatch(
        userHash,
        safeUrl
      );

      return {

        userHash,

        rateLimited: false,

        reply:
          `🗑 Removed from watchlist:\n${safeUrl}`,

      };

    } catch {

      return {

        userHash,

        rateLimited: false,

        reply:
          'Invalid URL for unwatch command.',

      };

    }
  }

  // =======================================
  // WATCHLIST COMMAND
  // =======================================

  if (
    lower === 'watchlist'
  ) {

    const urls =
      getWatchlist(userHash);

    if (
      urls.length === 0
    ) {

      return {

        userHash,

        rateLimited: false,

        reply:
          '📭 Your watchlist is empty.',

      };

    }

    return {

      userHash,

      rateLimited: false,

      reply:
        '👀 Your watchlist:\n\n' +
        urls.map(
          u => `• ${u}`
        ).join('\n'),

    };

  }

  // =======================================
  // URL EXTRACTION
  // =======================================

  const url =
    extractUrl(clean);

  if (!url) {

    return {

      userHash,

      rateLimited: false,

      reply:
`Send a URL directly to scan it.

Example:
https://example.com`,

    };

  }

  // =======================================
  // SAFE URL VALIDATION
  // =======================================

  let safeUrl: string;

  try {

    safeUrl =
      await validateScrapeUrl(
        url
      );

  } catch {

    return {

      userHash,

      rateLimited: false,

      reply:
        'Could not scan that URL. Please send a valid public http or https URL.',

    };

  }

  // =======================================
  // RUN PIPELINE
  // =======================================

  try {

    const result =
      await run(
        safeUrl,
        userHash
      );

    // =====================================
    // STORE ONLY SUCCESSFUL SCANS
    // =====================================

    if (
      !result?.error
    ) {

      await appendScan(

        userHash,

        safeUrl,

        result?.detectResult?.summary || []

      );

    }

    return {

      userHash,

      rateLimited: false,

      reply:
        result?.response ||
        'Scan completed.',

    };

  } catch (err) {

    console.error(
      'GuardianAI dispatcher failed:',
      err
    );

    return {

      userHash,

      rateLimited: false,

      reply:
        'Something went wrong while scanning this URL. Please try again later.',

    };

  }
}

// =========================================
// URL EXTRACTION
// =========================================

export function extractUrl(
  text: string
): string | null {

  const match =
    text.match(
      /https?:\/\/[^\s<>"']+/i
    );

  return match?.[0] ?? null;
}