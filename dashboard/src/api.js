const BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  health: () => req("/api/health"),
  listLists: () => req("/api/lists"),
  createList: (name) => req("/api/lists", { method: "POST", body: JSON.stringify({ name }) }),
  renameList: (id, name) =>
    req(`/api/lists/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteList: (id) => req(`/api/lists/${id}`, { method: "DELETE" }),

  listItems: (listId) => req(`/api/items${listId ? `?listId=${listId}` : ""}`),
  getItem: (id) => req(`/api/items/${id}`),
  createItem: (item) => req("/api/items", { method: "POST", body: JSON.stringify(item) }),
  updateItem: (id, patch) =>
    req(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteItem: (id) => req(`/api/items/${id}`, { method: "DELETE" }),

  triggerPriceCheck: () => req("/api/price-check", { method: "POST" }),

  sync: (items, lastSyncTime = null) =>
    req("/api/sync", { method: "POST", body: JSON.stringify({ items, lastSyncTime }) }),
};
