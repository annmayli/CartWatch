// Push local items to the backend; merge any updates back into local state.

import { getState, setState, recountLists } from "./storage.js";

export const API_BASE = "http://localhost:4000";
export const DASHBOARD_URL = "http://localhost:5173";

export async function syncWithBackend() {
  const state = await getState();
  const res = await fetch(`${API_BASE}/api/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      items: state.items,
      lists: state.lists,
      lastSyncTime: state.lastSyncTime,
    }),
  });
  if (!res.ok) throw new Error(`sync failed: ${res.status}`);
  const payload = await res.json();

  // Server is the source of truth after sync — it returns canonical items
  // (with server-side list IDs), the full set of lists, and tombstones for
  // anything the dashboard has deleted so we can purge local caches.
  const remoteLists = payload.lists || [];
  const deletedItemIds = new Set(payload.deletedItemIds || []);
  const deletedListIds = new Set(payload.deletedListIds || []);
  const items = (payload.updatedItems || [])
    .filter((i) => !deletedItemIds.has(i.id))
    .map((i) => ({ ...i }));
  const lists = (remoteLists.length ? remoteLists : state.lists).filter(
    (l) => !deletedListIds.has(l.id)
  );
  const next = {
    ...state,
    items,
    lists,
    lastSyncTime: payload.serverTime,
  };
  recountLists(next);
  await setState(next);
  return payload;
}
