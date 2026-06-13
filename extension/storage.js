// Wraps chrome.storage.local with a falls-back to localStorage for non-extension previews.

const KEY = "wishlist-state";

const fallback = {
  get(key) {
    return new Promise((resolve) => {
      try {
        const raw = localStorage.getItem(key);
        resolve({ [key]: raw ? JSON.parse(raw) : undefined });
      } catch {
        resolve({});
      }
    });
  },
  set(obj) {
    return new Promise((resolve) => {
      Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
      resolve();
    });
  },
};

const backend =
  typeof chrome !== "undefined" && chrome.storage?.local ? chrome.storage.local : fallback;

export async function getState() {
  const data = await backend.get(KEY);
  return (
    data[KEY] || {
      items: [],
      lists: [
        { id: "default-wishlist", name: "Wishlist", isDefault: true, itemCount: 0 },
        { id: "default-favorites", name: "Favorites", isDefault: true, itemCount: 0 },
      ],
      lastSyncTime: null,
    }
  );
}

export async function setState(state) {
  await backend.set({ [KEY]: state });
  return state;
}

export async function updateState(mutator) {
  const cur = await getState();
  const next = mutator(structuredClone(cur)) || cur;
  await setState(next);
  return next;
}

export function recountLists(state) {
  for (const list of state.lists) {
    list.itemCount = state.items.filter((i) => i.listId === list.id).length;
  }
  return state;
}
