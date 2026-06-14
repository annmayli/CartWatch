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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 21s-7.5-4.6-9.6-9.4C.7 7.6 3.6 4 7.4 4c2 0 3.5 1 4.6 2.5C13.1 5 14.6 4 16.6 4c3.8 0 6.7 3.6 5 7.6C19.5 16.4 12 21 12 21z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">CartWatch</div>
            <div className="text-xs text-slate-500">Price Tracker</div>
          </div>
        </div>

        <button className="btn btn-primary mb-4" onClick={() => setAdding(true)}>
          + Add item
        </button>

        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lists
          </span>
          <button
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
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

        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
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
                isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10" : "btn-ghost"
              }`
            }
          >
            Settings
          </NavLink>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">CartWatch</h1>
            <button className="btn btn-primary md:hidden" onClick={() => setAdding(true)}>
              + Add
            </button>
          </div>
          {error && (
            <div className="mt-2 rounded-md bg-rose-50 px-3 py-1.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {error}. Is the backend running on http://localhost:4000?
            </div>
          )}
        </header>

        <div className="px-6 py-6">
          {loading ? (
            <div className="text-slate-500">Loading…</div>
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
          `flex flex-1 items-center justify-between rounded-md px-2 py-1.5 text-sm ${
            isActive
              ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-100"
              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`
        }
      >
        <span className="truncate">{label}</span>
        {badge != null && (
          <span className="ml-2 rounded bg-slate-200 px-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {badge}
          </span>
        )}
      </NavLink>
      {onDelete && (
        <button
          onClick={onDelete}
          className="ml-1 hidden rounded p-1 text-slate-400 hover:text-rose-600 group-hover:block"
          title="Delete list"
        >
          ×
        </button>
      )}
    </div>
  );
}
