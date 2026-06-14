import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import { useStore } from "./store.jsx";
import AddItemModal from "./components/AddItemModal.jsx";

export default function App() {
  const { lists, loading, error, createList, deleteList, runPriceCheck } = useStore();
  const [adding, setAdding] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const navigate = useNavigate();
  const { listId } = useParams();

  async function submitList(e) {
    e.preventDefault();
    if (!newListName.trim()) return;
    const l = await createList(newListName.trim());
    setNewListName("");
    setCreatingList(false);
    navigate(`/lists/${l.id}`);
  }

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/60 bg-white/55 p-4 backdrop-blur-md md:flex">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 21s-7.5-4.6-9.6-9.4C.7 7.6 3.6 4 7.4 4c2 0 3.5 1 4.6 2.5C13.1 5 14.6 4 16.6 4c3.8 0 6.7 3.6 5 7.6C19.5 16.4 12 21 12 21z" />
            </svg>
          </div>
          <div>
            <div className="font-serif text-sm font-semibold leading-tight text-ink">CartWatch</div>
            <div className="text-xs text-ink-muted">Price Tracker</div>
          </div>
        </div>

        <button className="btn btn-primary mb-4" onClick={() => setAdding(true)}>
          + Add item
        </button>

        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Lists
          </span>
          <button
            className="rounded p-1 text-ink-muted hover:bg-romantic-peach/40 hover:text-ink"
            onClick={() => setCreatingList((v) => !v)}
            title="New list"
          >
            +
          </button>
        </div>

        {creatingList && (
          <form onSubmit={submitList} className="mb-2 flex gap-1">
            <input
              autoFocus
              className="input"
              placeholder="List name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">Add</button>
          </form>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          <NavItem to="/items" label="All items" badge={null} />
          {lists.map((l) => (
            <NavItem
              key={l.id}
              to={`/lists/${l.id}`}
              label={l.name}
              badge={l.itemCount}
              onDelete={
                l.isDefault
                  ? null
                  : async () => {
                      if (confirm(`Delete list "${l.name}"? Items inside will also be removed.`)) {
                        await deleteList(l.id);
                        if (listId === l.id) navigate("/items");
                      }
                    }
              }
            />
          ))}
        </nav>

        <div className="mt-4 space-y-2 border-t border-romantic-peach/50 pt-4">
          <button
            className="btn btn-ghost w-full justify-start"
            onClick={async () => {
              const r = await runPriceCheck();
              alert(`Checked ${r.checked} items, ${r.updated} prices updated.`);
            }}
          >
            Run price check
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `btn w-full justify-start ${
                isActive ? "bg-brand-50 font-medium text-brand-700" : "btn-ghost"
              }`
            }
          >
            Settings
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-white/60 bg-white/50 px-6 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-lg font-semibold text-ink">CartWatch</h1>
            <button className="btn btn-primary md:hidden" onClick={() => setAdding(true)}>
              + Add
            </button>
          </div>
          {error && (
            <div className="mt-2 rounded-lg bg-brand-50 px-3 py-1.5 text-sm text-brand-700">
              {error}. Is the backend running on http://localhost:4000?
            </div>
          )}
        </header>

        <div className="px-6 py-6">
          {loading ? (
            <div className="text-ink-muted">Loading…</div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      {adding && <AddItemModal onClose={() => setAdding(false)} />}
    </div>
  );
}

function NavItem({ to, label, badge, onDelete }) {
  return (
    <div className="group flex items-center">
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          `flex flex-1 items-center justify-between rounded-lg px-2 py-1.5 text-sm ${
            isActive
              ? "bg-brand-50 font-medium text-brand-700"
              : "text-ink hover:bg-romantic-peach/35"
          }`
        }
      >
        <span className="truncate">{label}</span>
        {badge != null && (
          <span className="ml-2 rounded-full bg-romantic-mint/60 px-1.5 text-xs text-ink-muted">
            {badge}
          </span>
        )}
      </NavLink>
      {onDelete && (
        <button
          onClick={onDelete}
          className="ml-1 hidden rounded p-1 text-ink-faint hover:text-brand-700 group-hover:block"
          title="Delete list"
        >
          ×
        </button>
      )}
    </div>
  );
}
