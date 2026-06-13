import { getState, updateState, recountLists } from "./storage.js";
import { syncWithBackend, DASHBOARD_URL } from "./sync.js";

const $ = (sel) => document.querySelector(sel);

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function detectStore(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return "";
  }
}

function fmtPrice(n) {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(n));
}

function setStatus(msg, kind) {
  const el = $("#save-status");
  el.textContent = msg || "";
  el.className = "status" + (kind ? " " + kind : "");
  if (msg) setTimeout(() => (el.textContent = ""), 2500);
}

function setSyncStatus(msg, kind) {
  const el = $("#sync-status");
  el.textContent = msg;
  el.className = "status" + (kind ? " " + kind : " muted");
}

async function renderLists() {
  const state = await getState();
  const select = $("#f-list");
  select.innerHTML = state.lists
    .map((l) => `<option value="${l.id}">${l.name}</option>`)
    .join("");

  const listsUl = $("#lists");
  listsUl.innerHTML = state.lists
    .map(
      (l) => `
      <li data-id="${l.id}">
        <span class="name">${escapeHtml(l.name)}</span>
        <span class="count">${l.itemCount}</span>
        ${l.isDefault ? "" : `<button class="delete" title="Delete">×</button>`}
      </li>
    `
    )
    .join("");

  listsUl.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.closest("li").dataset.id;
      if (!confirm("Delete this list and its items?")) return;
      await updateState((s) => {
        s.lists = s.lists.filter((l) => l.id !== id);
        s.items = s.items.filter((i) => i.listId !== id);
        return recountLists(s);
      });
      renderLists();
      renderRecent();
    });
  });
}

async function renderRecent() {
  const state = await getState();
  const recent = state.items.slice(-5).reverse();
  const ul = $("#recent");
  if (!recent.length) {
    ul.innerHTML = `<li class="empty">No items saved yet.</li>`;
    return;
  }
  ul.innerHTML = recent
    .map(
      (it) => `
      <li>
        ${it.imageUrl ? `<img src="${it.imageUrl}" alt="" />` : `<div style="width:32px;height:32px;background:var(--border);border-radius:4px"></div>`}
        <div class="meta">
          <div class="name">${escapeHtml(it.name)}</div>
          <div class="price">${fmtPrice(it.currentPrice)} · ${escapeHtml(it.store || "")}</div>
        </div>
      </li>
    `
    )
    .join("");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---------- Tab switching ----------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`#tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------- Open dashboard ----------
$("#open-dashboard").addEventListener("click", (e) => {
  e.preventDefault();
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    chrome.tabs.create({ url: DASHBOARD_URL });
  } else {
    window.open(DASHBOARD_URL, "_blank");
  }
});

// ---------- Save form ----------
$("#save-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#f-name").value.trim();
  if (!name) return;
  const link = $("#f-link").value.trim();
  const initial = parseFloat($("#f-initial").value) || 0;
  const current = parseFloat($("#f-current").value) || initial;
  const item = {
    id: uuid(),
    name,
    productLink: link,
    imageUrl: $("#f-image").value.trim(),
    initialPrice: initial,
    currentPrice: current,
    listId: $("#f-list").value,
    store: detectStore(link),
    dateCreated: new Date().toISOString(),
  };
  await updateState((s) => {
    s.items.push(item);
    return recountLists(s);
  });
  setStatus(`Saved "${name}"`, "success");
  e.target.reset();
  renderRecent();
  renderLists();
  // Try to push immediately. Failure is non-fatal; we'll retry on next sync.
  syncWithBackend().then(
    () => setSyncStatus(`Synced · ${new Date().toLocaleTimeString()}`, "success"),
    () => setSyncStatus("Local only (backend offline)")
  );
});

// ---------- New list form ----------
$("#new-list-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#new-list-name").value.trim();
  if (!name) return;
  await updateState((s) => {
    s.lists.push({ id: uuid(), name, isDefault: false, itemCount: 0 });
    return s;
  });
  $("#new-list-name").value = "";
  renderLists();
});

// ---------- Sync button ----------
$("#sync-now").addEventListener("click", async () => {
  setSyncStatus("Syncing…");
  try {
    await syncWithBackend();
    setSyncStatus(`Synced · ${new Date().toLocaleTimeString()}`, "success");
    renderLists();
    renderRecent();
  } catch (err) {
    setSyncStatus("Backend offline", "error");
  }
});

// ---------- Pre-fill from active tab when opened ----------
async function prefillFromActiveTab() {
  if (!(typeof chrome !== "undefined" && chrome.tabs?.query)) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    if (tab.url) $("#f-link").value = tab.url;
    if (tab.title) $("#f-name").value = tab.title.split(" | ")[0].split(" - ")[0].slice(0, 80);

    if (chrome.scripting?.executeScript) {
      const [{ result } = {}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const og = (p) => document.querySelector(`meta[property="og:${p}"]`)?.content;
          return {
            image: og("image") || document.querySelector('img[src]')?.src || "",
            title: og("title") || document.title,
          };
        },
      });
      if (result?.image) $("#f-image").value = result.image;
      if (result?.title && !$("#f-name").value) $("#f-name").value = result.title;
    }
  } catch {
    // ignore — content scripts may be blocked on chrome:// pages
  }
}

(async function init() {
  await renderLists();
  await renderRecent();
  await prefillFromActiveTab();
  // Best-effort initial sync.
  syncWithBackend().then(
    () => setSyncStatus(`Synced · ${new Date().toLocaleTimeString()}`, "success"),
    () => setSyncStatus("Local only (backend offline)")
  );
})();
