import * as fs from "node:fs";
import * as path from "node:path";

const MEMORY_DIR = "memory";

// Ensure memory directory exists
function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function sanitizeHash(hash: string) {
  return hash.replace(/[^a-zA-Z0-9_-]/g, "");
}
// Get user file path
function getUserFile(userHash: string) {
  userHash = sanitizeHash(userHash);

  return path.join(MEMORY_DIR, `${userHash}.json`);
}
// Default user structure
function defaultUserData() {
  return {
    watchlist: [],
    scans: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Read user memory safely
function readUserData(userHash: string) {
  ensureMemoryDir();

  const file = getUserFile(userHash);

  if (!fs.existsSync(file)) {
    const initial = defaultUserData();
    fs.writeFileSync(file, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.error("Failed to parse user memory:", err);

    const fallback = defaultUserData();
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));

    return fallback;
  }
}

// Save user memory
function saveUserData(userHash: string, data: any) {
  data.updatedAt = new Date().toISOString();

  fs.writeFileSync(
    getUserFile(userHash),
    JSON.stringify(data, null, 2)
  );
}

// Get watchlist
export function getWatchlist(userHash: string): string[] {
  const data = readUserData(userHash);
  return data.watchlist || [];
}

// Add URL
export function addWatch(userHash: string, url: string) {
  const data = readUserData(userHash);

  // Normalize URL
  url = url.trim();

  if (!data.watchlist.includes(url)) {
    data.watchlist.push(url);

    saveUserData(userHash, data);

    console.log(`[WATCHLIST] Added ${url} for ${userHash}`);
  }

  return data.watchlist;
}

// Remove URL
export function removeWatch(userHash: string, url: string) {
  const data = readUserData(userHash);

  data.watchlist = data.watchlist.filter(
    (u: string) => u !== url
  );

  saveUserData(userHash, data);

  console.log(`[WATCHLIST] Removed ${url} for ${userHash}`);

  return data.watchlist;
}

// Get all users for heartbeat scanning
export function getAllUsers(): string[] {
  ensureMemoryDir();

  return fs.readdirSync(MEMORY_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
}