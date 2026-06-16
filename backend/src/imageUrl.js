/** Normalize and validate product image URLs stored or synced from clients. */

export function normalizeImageUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  let u = raw.trim();
  if (!u) return null;

  if (/^https?:[^/]/i.test(u)) {
    u = u.replace(/^(https?):/i, "$1://");
  }
  if (u.startsWith("//")) u = `https:${u}`;

  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function looksLikeLogo(url) {
  const lower = String(url).toLowerCase();
  if (lower.includes("favicon")) return true;
  if (lower.endsWith(".svg") && (lower.includes("logo") || lower.includes("icon"))) return true;
  if (/(^|[/_-])logo([/_-]|\.|$)/.test(lower)) return true;
  return false;
}

export function isBrokenProductImageUrl(raw) {
  const u = normalizeImageUrl(raw);
  if (!u) return !!raw;
  try {
    return new URL(u).hostname === "files";
  } catch {
    return true;
  }
}

export function repairShopifyFilesUrl(raw, productLink) {
  if (!raw || !productLink) return null;
  const match = String(raw).trim().match(/^(?:https?:)?files\/(.+)$/i);
  if (!match) return null;
  const filename = match[1].split("?")[0];
  try {
    return `${new URL(productLink).origin}/cdn/shop/files/${filename}`;
  } catch {
    return null;
  }
}

export function resolveProductImageUrl(raw, productLink = null) {
  const candidates = [raw, repairShopifyFilesUrl(raw, productLink)].filter(Boolean);
  for (const c of candidates) {
    const u = normalizeImageUrl(c);
    if (u && !looksLikeLogo(u) && !isBrokenProductImageUrl(u)) return u;
  }
  return null;
}

export function isUsableProductImageUrl(raw, productLink = null) {
  return !!resolveProductImageUrl(raw, productLink);
}

/** Prefer a valid server URL over a stale/invalid client URL during sync. */
export function pickImageUrl(serverUrl, clientUrl, productLink = null) {
  const s = resolveProductImageUrl(serverUrl, productLink);
  const c = resolveProductImageUrl(clientUrl, productLink);
  if (s && !c) return s;
  if (c && !s) return c;
  if (s && c) return s;
  return s || c || null;
}
