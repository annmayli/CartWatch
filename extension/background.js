// Service worker: registers a context menu and periodically pushes local items to the backend.

const API_BASE = "http://localhost:4000";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "wishlist-save",
    title: "Save to Wishlist",
    contexts: ["page", "link", "image"],
  });
  // Sync every 30 minutes (alarm survives service worker eviction).
  chrome.alarms?.create("wishlist-sync", { periodInMinutes: 30 });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "wishlist-save") return;
  // Open the popup-style page; the user can adjust details before saving.
  chrome.action.openPopup?.().catch(() => {
    // openPopup is not always available; fall back to opening a tab.
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
  });
});

chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name !== "wishlist-sync") return;
  syncFromServiceWorker().catch(() => {});
});

async function syncFromServiceWorker() {
  const { "wishlist-state": state } = await chrome.storage.local.get("wishlist-state");
  if (!state || !state.items?.length) return;
  await fetch(`${API_BASE}/api/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: state.items, lastSyncTime: state.lastSyncTime }),
  });
}
