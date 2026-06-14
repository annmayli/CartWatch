import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { v4 as uuid } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data.sqlite");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local',
    name TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'local',
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    product_link TEXT,
    store TEXT,
    initial_price REAL NOT NULL,
    current_price REAL NOT NULL,
    date_created TEXT NOT NULL,
    last_price_check TEXT,
    purchased INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    price REAL NOT NULL,
    checked_at TEXT NOT NULL
  );

  -- Tombstones: remember deleted entity ids so /api/sync doesn't resurrect
  -- items the extension still has cached locally.
  CREATE TABLE IF NOT EXISTS deletions (
    entity_type TEXT NOT NULL,   -- 'item' | 'list'
    entity_id TEXT NOT NULL,
    deleted_at TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
  );

  CREATE INDEX IF NOT EXISTS idx_items_list ON items(list_id);
  CREATE INDEX IF NOT EXISTS idx_history_item ON price_history(item_id, checked_at);
  CREATE INDEX IF NOT EXISTS idx_deletions_at ON deletions(deleted_at);
`);

try {
  db.exec(`ALTER TABLE items ADD COLUMN purchased INTEGER NOT NULL DEFAULT 0`);
} catch {
  // Column already exists on databases created after this migration.
}

const defaultLists = ["Wishlist", "Favorites"];
const existing = db.prepare("SELECT name FROM lists WHERE is_default = 1").all().map((r) => r.name);
const insertList = db.prepare(
  "INSERT INTO lists (id, user_id, name, is_default, created_at) VALUES (?, 'local', ?, 1, ?)"
);
for (const name of defaultLists) {
  if (!existing.includes(name)) insertList.run(uuid(), name, new Date().toISOString());
}
