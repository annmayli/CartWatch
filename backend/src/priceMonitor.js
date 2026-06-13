import cron from "node-cron";
import { repo } from "./repo.js";

// MVP: simulate price drift so the dashboard chart populates.
// Swap this function for a real scraper (e.g. Cheerio) when ready.
async function fetchCurrentPrice(item) {
  const drift = (Math.random() - 0.55) * 0.08; // bias slightly downward
  const next = Math.max(0.01, item.currentPrice * (1 + drift));
  return Math.round(next * 100) / 100;
}

export async function runPriceCheck({ verbose = false } = {}) {
  const items = repo.getItems();
  let updated = 0;
  for (const item of items) {
    try {
      const price = await fetchCurrentPrice(item);
      if (price !== item.currentPrice) {
        repo.logPrice(item.id, price);
        updated++;
      }
    } catch (err) {
      if (verbose) console.error("price check failed", item.id, err.message);
    }
  }
  if (verbose) console.log(`[price-monitor] checked ${items.length} items, ${updated} updated`);
  return { checked: items.length, updated };
}

let started = false;
export function startPriceMonitor() {
  if (started) return;
  started = true;
  // Run a check shortly after boot so devs see data flowing.
  setTimeout(() => runPriceCheck({ verbose: true }).catch(() => {}), 2000);
  // And on a schedule. Keep it short for the prototype; spec says daily/weekly.
  cron.schedule("*/15 * * * *", () => runPriceCheck({ verbose: true }));
}
