import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "../store.jsx";
import ItemCard from "../components/ItemCard.jsx";
import AddItemModal from "../components/AddItemModal.jsx";

export default function Items() {
  const { listId } = useParams();
  const { items, lists, deleteItem, updateItem } = useStore();
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");

  const list = listId ? lists.find((l) => l.id === listId) : null;

  const filtered = useMemo(() => {
    let arr = listId ? items.filter((i) => i.listId === listId) : items;
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.store || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [items, listId, query]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">{list ? list.name : "All items"}</h2>
          <p className="text-sm text-ink-muted">
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Search items…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              lists={lists}
              onEdit={setEditing}
              onDelete={async (i) => {
                if (confirm(`Delete "${i.name}"?`)) await deleteItem(i.id);
              }}
              onMove={async (i, newListId) => {
                if (newListId !== i.listId) await updateItem(i.id, { listId: newListId });
              }}
            />
          ))}
        </div>
      )}

      {editing && <AddItemModal initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 text-5xl"></div>
      <h3 className="mb-1 text-lg font-semibold">No items yet</h3>
      <p className="max-w-sm text-sm text-ink-muted">
        Click <span className="font-medium">+ Add item</span> in the sidebar to save a product, or
        use the Chrome extension popup while browsing a store.
      </p>
    </div>
  );
}
