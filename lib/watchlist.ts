// lib/watchlist.ts

import * as fs from "node:fs";
import * as path from "node:path";

// =========================================
// CONSTANTS
// =========================================

const MEMORY_DIR = "memory";

// =========================================
// TYPES
// =========================================

type UserMemory = {

  telegramChatId: number | null;

  watchlist: string[];

  scans: any[];

  createdAt: string;

  updatedAt: string;

};

// =========================================
// ENSURE MEMORY DIRECTORY
// =========================================

function ensureMemoryDir() {

  if (!fs.existsSync(MEMORY_DIR)) {

    fs.mkdirSync(
      MEMORY_DIR,
      { recursive: true }
    );

  }
}

// =========================================
// SANITIZE USER HASH
// =========================================

function sanitizeHash(
  hash: string
) {

  return hash.replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  );
}

// =========================================
// USER FILE PATH
// =========================================

function getUserFile(
  userHash: string
) {

  userHash =
    sanitizeHash(userHash);

  return path.join(
    MEMORY_DIR,
    `${userHash}.json`
  );
}

// =========================================
// DEFAULT USER STRUCTURE
// =========================================

function defaultUserData(): UserMemory {

  return {

    telegramChatId: null,

    watchlist: [],

    scans: [],

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };
}

// =========================================
// READ USER MEMORY
// =========================================

function readUserData(
  userHash: string
): UserMemory {

  ensureMemoryDir();

  const file =
    getUserFile(userHash);

  // =======================================
  // CREATE NEW FILE
  // =======================================

  if (!fs.existsSync(file)) {

    const initial =
      defaultUserData();

    fs.writeFileSync(
      file,
      JSON.stringify(
        initial,
        null,
        2
      )
    );

    return initial;
  }

  // =======================================
  // LOAD EXISTING FILE
  // =======================================

  try {

    return JSON.parse(
      fs.readFileSync(
        file,
        "utf-8"
      )
    );

  } catch (err) {

    console.error(
      "Failed to parse user memory:",
      err
    );

    // =====================================
    // FALLBACK RECOVERY
    // =====================================

    const fallback =
      defaultUserData();

    fs.writeFileSync(
      file,
      JSON.stringify(
        fallback,
        null,
        2
      )
    );

    return fallback;
  }
}

// =========================================
// SAVE USER MEMORY
// =========================================

function saveUserData(
  userHash: string,
  data: UserMemory
) {

  data.updatedAt =
    new Date().toISOString();

  fs.writeFileSync(

    getUserFile(userHash),

    JSON.stringify(
      data,
      null,
      2
    )

  );
}

// =========================================
// GET WATCHLIST
// =========================================

export function getWatchlist(
  userHash: string
): string[] {

  const data =
    readUserData(userHash);

  return (
    data.watchlist || []
  );
}

// =========================================
// ADD WATCH URL
// =========================================

export function addWatch(
  userHash: string,
  url: string
) {

  const data =
    readUserData(userHash);

  // Normalize URL
  url = url.trim();

  if (
    !data.watchlist.includes(url)
  ) {

    data.watchlist.push(url);

    saveUserData(
      userHash,
      data
    );

    console.log(
      `[WATCHLIST] Added ${url} for ${userHash}`
    );
  }

  return data.watchlist;
}

// =========================================
// REMOVE WATCH URL
// =========================================

export function removeWatch(
  userHash: string,
  url: string
) {

  const data =
    readUserData(userHash);

  data.watchlist =
    data.watchlist.filter(

      (u: string) =>
        u !== url

    );

  saveUserData(
    userHash,
    data
  );

  console.log(
    `[WATCHLIST] Removed ${url} for ${userHash}`
  );

  return data.watchlist;
}

// =========================================
// TELEGRAM CHAT ID
// =========================================

export function setTelegramChatId(
  userHash: string,
  chatId: number
) {

  const data =
    readUserData(userHash);

  data.telegramChatId =
    chatId;

  saveUserData(
    userHash,
    data
  );

  console.log(
    `[TELEGRAM] Saved chatId for ${userHash}`
  );
}

export function getTelegramChatId(
  userHash: string
): number | null {

  const data =
    readUserData(userHash);

  return (
    data.telegramChatId || null
  );
}

// =========================================
// GET ALL USERS
// =========================================

export function getAllUsers(): string[] {

  ensureMemoryDir();

  return fs.readdirSync(
    MEMORY_DIR
  )

    .filter(
      f => f.endsWith(".json")
    )

    .map(
      f => f.replace(".json", "")
    );
}