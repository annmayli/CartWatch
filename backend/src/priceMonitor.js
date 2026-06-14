import cron from "node-cron";
import * as cheerio from "cheerio";
import { repo } from "./repo.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 10_000;

// Best-effort numeric parse for price strings like "$1,299.99", "USD 199.99",
// "€1.299,00", "199,99". Returns null when nothing usable is found.
function parsePrice(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw * 100) / 100;
  }
  const cleaned = String(raw).replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Whichever separator appears last is the decimal separator.
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    // "199,99" -> decimal comma; "1,299" -> thousands separator.
    normalized =
      parts.length === 2 && parts[1].length === 2
        ? `${parts[0]}.${parts[1]}`
        : cleaned.replace(/,/g, "");
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

// Schema.org Product/Offer can be nested under @graph or arrays; walk recursively.
function findPriceInLd(node) {
  if (!node || typeof node !== "object") return null;
  if (node.offers) {
    const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
    for (const o of offers) {
      const p = parsePrice(o?.price ?? o?.lowPrice ?? o?.highPrice);
      if (p != null) return p;
    }
  }
  if (node.price != null) {
    const p = parsePrice(node.price);
    if (p != null) return p;
  }
  if (Array.isArray(node["@graph"])) {
    for (const g of node["@graph"]) {
      const p = findPriceInLd(g);
      if (p != null) return p;
    }
  }
  return null;
}

function extractPriceFromHtml(html) {
  const $ = cheerio.load(html);

  const ldNodes = $('script[type="application/ld+json"]');
  for (let i = 0; i < ldNodes.length; i++) {
    const text = $(ldNodes[i]).contents().text();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of candidates) {
        const p = findPriceInLd(node);
        if (p != null) return p;
      }
    } catch {
      // Sites sometimes embed malformed or multi-document JSON-LD; ignore and fall through.
    }
  }

  const metaSelectors = [
    'meta[itemprop="price"]',
    'meta[property="product:price:amount"]',
    'meta[name="product:price:amount"]',
    'meta[property="og:price:amount"]',
  ];
  for (const sel of metaSelectors) {
    const v = $(sel).attr("content");
    const p = parsePrice(v);
    if (p != null) return p;
  }

  const itemprop = $('[itemprop="price"]').first();
  if (itemprop.length) {
    const v = itemprop.attr("content") || itemprop.text();
    const p = parsePrice(v);
    if (p != null) return p;
  }

  const dp = parsePrice($("[data-price]").first().attr("data-price"));
  if (dp != null) return dp;

  return null;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCurrentPrice(item) {
  if (!item.productLink) return null;
  const html = await fetchHtml(item.productLink);
  return extractPriceFromHtml(html);
}

export async function runPriceCheck({ verbose = false } = {}) {
  const items = repo.getItems();
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const price = await fetchCurrentPrice(item);
      if (price == null) {
        skipped++;
        if (verbose) {
          console.warn(
            `[price-monitor] no price found for ${item.id} (${item.name})`
          );
        }
        continue;
      }
      if (price !== item.currentPrice) {
        repo.logPrice(item.id, price);
        updated++;
      }
    } catch (err) {
      failed++;
      if (verbose) console.error("price check failed", item.id, err.message);
    }
  }
  if (verbose) {
    console.log(
      `[price-monitor] checked ${items.length} items, ${updated} updated, ${skipped} skipped, ${failed} failed`
    );
  }
  return { checked: items.length, updated, skipped, failed };
}

let started = false;
export function startPriceMonitor() {
  if (started) return;
  started = true;
  setTimeout(() => runPriceCheck({ verbose: true }).catch(() => {}), 2000);
  cron.schedule("*/15 * * * *", () => runPriceCheck({ verbose: true }));
}

export const __internal = { parsePrice, extractPriceFromHtml };
