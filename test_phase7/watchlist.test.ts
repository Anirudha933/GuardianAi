import { addWatch, getWatchlist, removeWatch } from "../services/watchlist.ts";

export function testWatchlist() {
  console.log("\n--- Watchlist Test ---");

  addWatch("https://test.com");
  const list = getWatchlist();

  console.log("Current Watchlist:", list);

  removeWatch("https://test.com");
  console.log("After Removal:", getWatchlist());
}