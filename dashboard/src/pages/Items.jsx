import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "../store.jsx";
import ItemCard from "../components/ItemCard.jsx";
import AddItemModal from "../components/AddItemModal.jsx";

const STATUS_FILTERS = [
  { value: "active", label: "Active" },
  { value: "purchased", label: "Purchased" },
  { value: "all", label: "All" },
];

export default function Items() {
  const { listId } = useParams();
  const { items, lists, deleteItem, updateItem } = useStore();
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [storeFilter, setStoreFilter] = useState("");

  const list = listId ? lists.find((l) => l.id === listId) : null;

  useEffect(() => {
    setStoreFilter("");
  }, [listId]);

  const scopedItems = useMemo(
    () => (listId ? items.filter((i) => i.listId === listId) : items),
    [items, listId]
  );

  const storeOptions = useMemo(() => {
    const stores = new Set();
    let hasEmpty = false;
    for (const i of scopedItems) {
      if (i.store) stores.add(i.store);
      else hasEmpty = true;
    }
    return {
      stores: [...stores].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
      hasEmpty,
    };
  }, [scopedItems]);

  const filtered = useMemo(() => {
    let arr = scopedItems;
    if (statusFilter === "active") arr = arr.filter((i) => !i.purchased);
    else if (statusFilter === "purchased") arr = arr.filter((i) => i.purchased);
    if (storeFilter === "__none__") arr = arr.filter((i) => !i.store);
    else if (storeFilter) arr = arr.filter((i) => i.store === storeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((i) => i.name.toLowerCase().includes(q));
    }
    return arr;
  }, [scopedItems, query, statusFilter, storeFilter]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">{list ? list.name : "All items"}</h2>
          <p className="text-sm text-ink-muted">
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-romantic-peach/50 bg-white/70 p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === f.value
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {storeOptions.stores.length > 0 || storeOptions.hasEmpty ? (
            <select
              className="input w-auto min-w-[8rem]"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="">All stores</option>
              {storeOptions.stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
              {storeOptions.hasEmpty && <option value="__none__">No store</option>}
            </select>
          ) : null}
          <input
            className="input max-w-xs"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState statusFilter={statusFilter} storeFilter={storeFilter} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              lists={lists}
              onEdit={setEditing}
              onTogglePurchased={async (i) => {
                await updateItem(i.id, { purchased: !i.purchased });
              }}
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

function EmptyState({ statusFilter, storeFilter }) {
  const message =
    storeFilter
      ? "No items match this store filter. Try a different store or clear the filter."
      : statusFilter === "purchased"
      ? "No purchased items yet. Mark something as purchased from its detail page or card menu."
      : statusFilter === "active"
      ? "No active items. Add a product or switch to Purchased / All to see more."
      : "No items yet.";

  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <h3 className="mb-1 text-lg font-semibold">Nothing here</h3>
      <p className="max-w-sm text-sm text-ink-muted">
        {message}{" "}
        {statusFilter !== "purchased" && (
          <>
            Click <span className="font-medium">+ Add item</span> in the sidebar, or use the
            Chrome extension while browsing a store.
          </>
        )}
      </p>
    </div>
  );
}
