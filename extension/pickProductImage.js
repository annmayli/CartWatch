import {
  isBrokenProductImageUrl,
  isUsableProductImageUrl,
  looksLikeLogo,
  normalizeImageUrl,
  repairShopifyFilesUrl,
  resolveProductImageUrl,
} from "./imageUrl.js";

function metaContent(doc, selector) {
  return doc.querySelector(selector)?.content || null;
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

function imagesFromJsonLd(doc) {
  const urls = [];
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    const text = script.textContent?.trim();
    if (!text) continue;
    try {
      collectJsonLdImages(JSON.parse(text), urls);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return urls;
}

function pickLargestDomImage(doc) {
  const candidates = [];
  for (const img of doc.querySelectorAll("img[src], img[srcset]")) {
    const src = img.currentSrc || img.src || img.getAttribute("src");
    const url = resolveProductImageUrl(src, doc.location?.href);
    if (!url) continue;
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w > 0 && h > 0 && (w < 80 || h < 80)) continue;
    candidates.push({ url, area: w * h });
  }
  candidates.sort((a, b) => b.area - a.area);
  return candidates[0]?.url || null;
}

export function pickProductImage(doc = document) {
  const pageUrl = doc.location?.href || null;

  const metaCandidates = [
    metaContent(doc, 'meta[property="og:image:secure_url"]'),
    metaContent(doc, 'meta[property="og:image"]'),
    metaContent(doc, 'meta[name="twitter:image"]'),
  ];

  for (const raw of metaCandidates) {
    if (!raw) continue;
    if (isBrokenProductImageUrl(raw)) {
      const repaired = repairShopifyFilesUrl(raw, pageUrl);
      const resolved = resolveProductImageUrl(repaired, pageUrl);
      if (resolved) return resolved;
      continue;
    }
    const resolved = resolveProductImageUrl(raw, pageUrl);
    if (resolved) return resolved;
  }

  for (const raw of imagesFromJsonLd(doc)) {
    const resolved = resolveProductImageUrl(raw, pageUrl);
    if (resolved) return resolved;
  }

  return pickLargestDomImage(doc);
}

export function detectProduct(doc = document) {
  const og = (p) => doc.querySelector(`meta[property="og:${p}"]`)?.content;
  const meta = (n) => doc.querySelector(`meta[name="${n}"]`)?.content;

  const priceText =
    doc.querySelector('[itemprop="price"]')?.getAttribute("content") ||
    doc.querySelector('[data-price]')?.getAttribute("data-price") ||
    meta("product:price:amount");

  return {
    title: og("title") || doc.title,
    image: pickProductImage(doc),
    url: doc.location?.href || "",
    price: priceText ? parseFloat(priceText) : null,
  };
}

export { isUsableProductImageUrl, normalizeImageUrl, resolveProductImageUrl };
