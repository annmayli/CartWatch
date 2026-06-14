import { db } from "./db.js";
import { v4 as uuid } from "uuid";

const itemRow = (r) =>
  r && {
    id: r.id,
    listId: r.list_id,
    name: r.name,
    imageUrl: r.image_url,
    productLink: r.product_link,
    store: r.store,
    initialPrice: r.initial_price,
    currentPrice: r.current_price,
    dateCreated: r.date_created,
    lastPriceCheck: r.last_price_check,
    purchased: !!r.purchased,
  };

const listRow = (r) =>
  r && {
    id: r.id,
    name: r.name,
    isDefault: !!r.is_default,
    createdAt: r.created_at,
    itemCount: r.item_count ?? 0,
  };

export const repo = {
  // ---------- Lists ----------
  getLists() {
    return db
      .prepare(
        `SELECT l.*, (SELECT COUNT(*) FROM items WHERE list_id = l.id) AS item_count
         FROM lists l ORDER BY l.is_default DESC, l.created_at ASC`
      )
      .all()
      .map(listRow);
  },
  createList(name) {
    const id = uuid();
    db.prepare(
      "INSERT INTO lists (id, name, is_default, created_at) VALUES (?, ?, 0, ?)"
    ).run(id, name, new Date().toISOString());
    return this.getList(id);
  },
  getList(id) {
    return listRow(
      db
        .prepare(
          `SELECT l.*, (SELECT COUNT(*) FROM items WHERE list_id = l.id) AS item_count
           FROM lists l WHERE l.id = ?`
        )
        .get(id)
    );
  },
  updateList(id, name) {
    db.prepare("UPDATE lists SET name = ? WHERE id = ?").run(name, id);
    return this.getList(id);
  },
  deleteList(id) {
    const list = db.prepare("SELECT is_default FROM lists WHERE id = ?").get(id);
    if (!list) return false;
    if (list.is_default) throw new Error("Cannot delete a default list");
    // Record tombstones for the list and every item it cascades-deletes, so
    // /api/sync clients can purge them and won't resurrect them later.
    const itemIds = db
      .prepare("SELECT id FROM items WHERE list_id = ?")
      .all(id)
      .map((r) => r.id);
    db.prepare("DELETE FROM lists WHERE id = ?").run(id);
    const now = new Date().toISOString();
    const insertTomb = db.prepare(
      "INSERT OR REPLACE INTO deletions (entity_type, entity_id, deleted_at) VALUES (?, ?, ?)"
    );
    insertTomb.run("list", id, now);
    for (const iid of itemIds) insertTomb.run("item", iid, now);
    return true;
  },

  // ---------- Items ----------
  getItems({ listId } = {}) {
    const rows = listId
      ? db.prepare("SELECT * FROM items WHERE list_id = ? ORDER BY date_created DESC").all(listId)
      : db.prepare("SELECT * FROM items ORDER BY date_created DESC").all();
    return rows.map(itemRow);
  },
  getItem(id) {
    return itemRow(db.prepare("SELECT * FROM items WHERE id = ?").get(id));
  },
  createItem(input) {
    const id = input.id || uuid();
    const now = new Date().toISOString();
    const initial = Number(input.initialPrice ?? input.currentPrice ?? 0);
    const current = Number(input.currentPrice ?? initial);
    db.prepare(
      `INSERT INTO items (id, list_id, name, image_url, product_link, store, initial_price, current_price, date_created, last_price_check, purchased)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.listId,
      input.name,
      input.imageUrl ?? null,
      input.productLink ?? null,
      input.store ?? null,
      initial,
      current,
      input.dateCreated || now,
      now,
      input.purchased ? 1 : 0
    );
    db.prepare(
      "INSERT INTO price_history (id, item_id, price, checked_at) VALUES (?, ?, ?, ?)"
    ).run(uuid(), id, current, now);
    // If this id was previously tombstoned (e.g. user re-creates), clear it.
    db.prepare(
      "DELETE FROM deletions WHERE entity_type = 'item' AND entity_id = ?"
    ).run(id);
    return this.getItem(id);
  },
  updateItem(id, patch) {
    const cur = this.getItem(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    db.prepare(
      `UPDATE items
       SET list_id = ?, name = ?, image_url = ?, product_link = ?, store = ?,
           initial_price = ?, current_price = ?, purchased = ?
       WHERE id = ?`
    ).run(
      next.listId,
      next.name,
      next.imageUrl,
      next.productLink,
      next.store,
      next.initialPrice,
      next.currentPrice,
      next.purchased ? 1 : 0,
      id
    );
    if (patch.currentPrice != null && patch.currentPrice !== cur.currentPrice) {
      db.prepare(
        "INSERT INTO price_history (id, item_id, price, checked_at) VALUES (?, ?, ?, ?)"
      ).run(uuid(), id, Number(patch.currentPrice), new Date().toISOString());
      db.prepare("UPDATE items SET last_price_check = ? WHERE id = ?").run(
        new Date().toISOString(),
        id
      );
    }
    return this.getItem(id);
  },
  deleteItem(id) {
    const r = db.prepare("DELETE FROM items WHERE id = ?").run(id);
    if (r.changes > 0) {
      db.prepare(
        "INSERT OR REPLACE INTO deletions (entity_type, entity_id, deleted_at) VALUES ('item', ?, ?)"
      ).run(id, new Date().toISOString());
    }
    return r.changes > 0;
  },

  // ---------- Tombstones ----------
  getDeletedItemIds(since = null) {
    const rows = since
      ? db
          .prepare(
            "SELECT entity_id FROM deletions WHERE entity_type = 'item' AND deleted_at > ?"
          )
          .all(since)
      : db
          .prepare("SELECT entity_id FROM deletions WHERE entity_type = 'item'")
          .all();
    return rows.map((r) => r.entity_id);
  },
  getDeletedListIds(since = null) {
    const rows = since
      ? db
          .prepare(
            "SELECT entity_id FROM deletions WHERE entity_type = 'list' AND deleted_at > ?"
          )
          .all(since)
      : db
          .prepare("SELECT entity_id FROM deletions WHERE entity_type = 'list'")
          .all();
    return rows.map((r) => r.entity_id);
  },

  // ---------- Price history ----------
  getPriceHistory(itemId) {
    return db
      .prepare(
        "SELECT id, price, checked_at as checkedAt FROM price_history WHERE item_id = ? ORDER BY checked_at ASC"
      )
      .all(itemId);
  },
  logPrice(itemId, price) {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO price_history (id, item_id, price, checked_at) VALUES (?, ?, ?, ?)"
    ).run(uuid(), itemId, price, now);
    db.prepare(
      "UPDATE items SET current_price = ?, last_price_check = ? WHERE id = ?"
    ).run(price, now, itemId);
  },
};
