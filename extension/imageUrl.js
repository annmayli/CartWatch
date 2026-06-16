/** @typedef {string | null | undefined} MaybeUrl */

/** @param {MaybeUrl} raw */
export function normalizeImageUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  let u = raw.trim();
  if (!u) return null;
  if (/^https?:[^/]/i.test(u)) u = u.replace(/^(https?):/i, "$1://");
  if (u.startsWith("//")) u = `https:${u}`;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** @param {string} url */
export function looksLikeLogo(url) {
  const lower = String(url).toLowerCase();
  if (lower.includes("favicon")) return true;
  if (lower.endsWith(".svg") && (lower.includes("logo") || lower.includes("icon"))) return true;
  if (/(^|[/_-])logo([/_-]|\.|$)/.test(lower)) return true;
  return false;
}

/** Hostnames like http://files/... from broken Shopify og:image tags. */
export function isBrokenProductImageUrl(raw) {
  const u = normalizeImageUrl(raw);
  if (!u) return !!raw;
  try {
    return new URL(u).hostname === "files";
  } catch {
    return true;
  }
}

/**
 * Reconstruct Shopify CDN URLs from broken meta tags like
 * "http:files/product.jpg" -> "https://store.com/cdn/shop/files/product.jpg"
 * @param {MaybeUrl} raw
 * @param {MaybeUrl} pageUrl
 */
export function repairShopifyFilesUrl(raw, pageUrl) {
  if (!raw || !pageUrl) return null;
  const match = String(raw).trim().match(/^(?:https?:)?files\/(.+)$/i);
  if (!match) return null;
  const filename = match[1].split("?")[0];
  try {
    return `${new URL(pageUrl).origin}/cdn/shop/files/${filename}`;
  } catch {
    return null;
  }
}

/** @param {MaybeUrl} raw @param {MaybeUrl} [pageUrl] */
export function resolveProductImageUrl(raw, pageUrl = null) {
  const candidates = [raw, repairShopifyFilesUrl(raw, pageUrl)].filter(Boolean);
  for (const c of candidates) {
    const u = normalizeImageUrl(c);
    if (u && !looksLikeLogo(u) && !isBrokenProductImageUrl(u)) return u;
  }
  return null;
}

/** @param {MaybeUrl} raw @param {MaybeUrl} [pageUrl] */
export function isUsableProductImageUrl(raw, pageUrl = null) {
  return !!resolveProductImageUrl(raw, pageUrl);
}
