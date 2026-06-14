import express from "express";
import cors from "cors";
import { repo } from "./repo.js";
import { runPriceCheck, startPriceMonitor } from "./priceMonitor.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------- Lists ----------
app.get("/api/lists", (_req, res) => res.json(repo.getLists()));
app.post("/api/lists", (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "name required" });
  res.status(201).json(repo.createList(name));
});
app.put("/api/lists/:id", (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "name required" });
  const updated = repo.updateList(req.params.id, name);
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});
app.delete("/api/lists/:id", (req, res) => {
  try {
    const ok = repo.deleteList(req.params.id);
    if (!ok) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- Items ----------
app.get("/api/items", (req, res) => {
  res.json(repo.getItems({ listId: req.query.listId }));
});
app.get("/api/items/:id", (req, res) => {
  const item = repo.getItem(req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });
  res.json({ ...item, priceHistory: repo.getPriceHistory(item.id) });
});
app.post("/api/items", (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.listId) return res.status(400).json({ error: "name and listId required" });
  res.status(201).json(repo.createItem(b));
});
app.put("/api/items/:id", (req, res) => {
  const updated = repo.updateItem(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});
app.delete("/api/items/:id", (req, res) => {
  const ok = repo.deleteItem(req.params.id);
  if (!ok) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

// ---------- Price monitoring ----------
app.get("/api/items/:id/price-history", (req, res) => {
  res.json(repo.getPriceHistory(req.params.id));
});
app.post("/api/price-check", async (_req, res) => {
  const result = await runPriceCheck({ verbose: false });
  res.json(result);
});

// ---------- Sync (extension <-> backend) ----------
app.post("/api/sync", (req, res) => {
  const incomingItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const incomingLists = Array.isArray(req.body?.lists) ? req.body.lists : [];
  const lastSyncTime = req.body?.lastSyncTime || null;

  // Tombstones: client may still be holding entities the server has deleted.
  // We must NOT recreate them on sync.
  const deletedItemIds = new Set(repo.getDeletedItemIds());
  const deletedListIds = new Set(repo.getDeletedListIds());

  // Build a mapping from incoming (client-side) list IDs to server-side list IDs.
  // For lists that don't yet exist on the server (by id or by name) we create them.
  const idMap = new Map();
  let serverLists = repo.getLists();
  const byId = (lists) => new Map(lists.map((l) => [l.id, l]));
  const byName = (lists) => new Map(lists.map((l) => [l.name.toLowerCase(), l]));

  for (const l of incomingLists) {
    if (!l?.name) continue;
    if (deletedListIds.has(l.id)) continue; // server explicitly deleted it
    const idx = byId(serverLists);
    const nameIdx = byName(serverLists);
    if (idx.has(l.id)) {
      idMap.set(l.id, l.id);
    } else if (nameIdx.has(l.name.toLowerCase())) {
      idMap.set(l.id, nameIdx.get(l.name.toLowerCase()).id);
    } else if (!l.isDefault) {
      const created = repo.createList(l.name);
      serverLists = repo.getLists();
      idMap.set(l.id, created.id);
    }
  }

  // Common defaults the extension uses before its first sync.
  const nameIdx = byName(serverLists);
  if (nameIdx.has("wishlist")) idMap.set("default-wishlist", nameIdx.get("wishlist").id);
  if (nameIdx.has("favorites")) idMap.set("default-favorites", nameIdx.get("favorites").id);

  const lookup = byId(serverLists);
  const fallback = serverLists.find((l) => l.isDefault) || serverLists[0];

  function resolveListId(item) {
    if (lookup.has(item.listId)) return item.listId;
    if (idMap.has(item.listId)) return idMap.get(item.listId);
    return fallback.id;
  }

  const knownItemIds = new Set(repo.getItems().map((i) => i.id));
  for (const it of incomingItems) {
    if (!it?.id || !it.name) continue;
    // Don't resurrect items the dashboard deleted on the server.
    if (deletedItemIds.has(it.id)) continue;
    const safe = { ...it, listId: resolveListId(it) };
    if (knownItemIds.has(safe.id)) {
      repo.updateItem(safe.id, safe);
    } else {
      repo.createItem(safe);
    }
  }

  const allItems = repo.getItems();
  const priceUpdates = lastSyncTime
    ? allItems
        .filter((i) => i.lastPriceCheck && i.lastPriceCheck > lastSyncTime)
        .map((i) => ({ itemId: i.id, newPrice: i.currentPrice, checkedAt: i.lastPriceCheck }))
    : [];

  res.json({
    serverTime: new Date().toISOString(),
    updatedItems: allItems,
    lists: repo.getLists(),
    // Echo tombstones so clients can purge their local caches.
    deletedItemIds: [...deletedItemIds],
    deletedListIds: [...deletedListIds],
    priceUpdates,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CartWatch backend listening on http://localhost:${PORT}`);
  startPriceMonitor();
});
