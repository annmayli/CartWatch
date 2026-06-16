import * as cheerio from "cheerio";
import {
  isBrokenProductImageUrl,
  repairShopifyFilesUrl,
  resolveProductImageUrl,
} from "./imageUrl.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 10_000;

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

function addImageValue(image, urls) {
  if (!image) return;
  if (typeof image === "string") urls.push(image);
  else if (Array.isArray(image)) image.forEach((i) => addImageValue(i, urls));
  else if (typeof image === "object" && image.url) urls.push(image.url);
}

function collectJsonLdImages(node, urls) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectJsonLdImages(n, urls));
    return;
  }
  const type = node["@type"];
  const isProduct =
    type === "Product" || (Array.isArray(type) && type.includes("Product"));
  if (isProduct) addImageValue(node.image, urls);
  if (node["@graph"]) collectJsonLdImages(node["@graph"], urls);
}

function imagesFromHtml($) {
  const urls = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    const text = $(el).contents().text()?.trim();
    if (!text) return;
    try {
      collectJsonLdImages(JSON.parse(text), urls);
    } catch {
      // ignore malformed JSON-LD
    }
  });
  return urls;
}

function pickFromHtml(html, productLink) {
  const $ = cheerio.load(html);

  const metaCandidates = [
    $('meta[property="og:image:secure_url"]').attr("content"),
    $('meta[property="og:image"]').attr("content"),
    $('meta[name="twitter:image"]').attr("content"),
  ];

  for (const raw of metaCandidates) {
    if (!raw) continue;
    if (isBrokenProductImageUrl(raw)) {
      const repaired = repairShopifyFilesUrl(raw, productLink);
      const resolved = resolveProductImageUrl(repaired, productLink);
      if (resolved) return resolved;
      continue;
    }
    const resolved = resolveProductImageUrl(raw, productLink);
    if (resolved) return resolved;
  }

  for (const raw of imagesFromHtml($)) {
    const resolved = resolveProductImageUrl(raw, productLink);
    if (resolved) return resolved;
  }

  return null;
}

/** Fetch a product page and extract the best product image URL. */
export async function fetchProductImageUrl(productLink) {
  if (!productLink) return null;
  try {
    const html = await fetchHtml(productLink);
    return pickFromHtml(html, productLink);
  } catch {
    return null;
  }
}

export async function ensureItemImageUrl(item) {
  if (resolveProductImageUrl(item.imageUrl, item.productLink)) {
    return item.imageUrl;
  }
  if (!item.productLink) return item.imageUrl ?? null;
  return fetchProductImageUrl(item.productLink);
}

export const __internal = { pickFromHtml, fetchHtml };
