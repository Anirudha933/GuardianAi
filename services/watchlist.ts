import * as fs from "fs";

const FILE = "memory/watchlist.json";

export function getWatchlist(): string[] {
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

export function addWatch(url: string) {
  const list = getWatchlist();
  if (!list.includes(url)) {
    list.push(url);
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
    console.log("Added:", url);
  }
}

export function removeWatch(url: string) {
  const list = getWatchlist().filter(u => u !== url);
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
  console.log("Removed:", url);
}