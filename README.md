# CartWatch

A small full-stack app for saving products from any online store and watching
their prices over time. It has three parts:

| Folder       | What it is                            | Tech                                         |
| ------------ | ------------------------------------- | -------------------------------------------- |
| `backend/`   | REST API + SQLite store + price cron  | Node.js, Express, `better-sqlite3`, node-cron|
| `dashboard/` | Web UI for browsing wishlists & charts| React 18, Vite, Tailwind CSS, Recharts       |
| `extension/` | Chrome extension for one-click saves  | Manifest V3, vanilla JS                      |

The dashboard and extension both talk to the backend at
`http://localhost:4000`.

---

## Prerequisites

- **Node.js 18+** and **npm** (Node 20 LTS recommended). `better-sqlite3`
  builds a native module — on macOS make sure Xcode Command Line Tools are
  installed (`xcode-select --install`).
- **Google Chrome** (or any Chromium-based browser) to load the extension.
- **Python 3** with **Pillow** — _optional_, only if you want to regenerate
  the extension icons (`pip install pillow`).

---

## 1. Install dependencies

From the **repo root**:

```bash
npm install
```

The root `package.json` has a `postinstall` hook that installs `backend/`
and `dashboard/` for you. (You can still install them individually with
`npm install --prefix backend` and `npm install --prefix dashboard` if you
prefer.)

The extension has no build step or dependencies — it loads directly from the
`extension/` folder.

---

## 2. Run the backend + dashboard

The fastest path — from the repo root, in one command:

```bash
npm run dev
```

This uses [`concurrently`](https://www.npmjs.com/package/concurrently) to
start both servers in the same terminal:

- backend on <http://localhost:4000>
- dashboard on <http://localhost:5173>

If you'd rather have them in separate terminals (handy when debugging):

```bash
# Terminal 1
npm run dev:backend     # equivalent to: npm run dev --prefix backend

# Terminal 2
npm run dev:dashboard   # equivalent to: npm run dev --prefix dashboard
```

### What the backend does

You should see:

```
CartWatch backend listening on http://localhost:4000
```

On first run it creates `backend/data.sqlite` and seeds two default lists
(`Wishlist` and `Favorites`). A price check runs ~2 seconds after boot and
again every 15 minutes — see `backend/src/priceMonitor.js`.

Quick sanity check:

```bash
curl http://localhost:4000/api/health
# -> {"ok":true}
```

Useful endpoints:

- `GET  /api/lists` · `POST /api/lists` · `PUT/DELETE /api/lists/:id`
- `GET  /api/items?listId=…` · `POST /api/items` · `PUT/DELETE /api/items/:id`
- `GET  /api/items/:id/price-history`
- `POST /api/price-check` — manually trigger a price refresh
- `POST /api/sync` — used by the extension to reconcile its local items

The HTTP port can be overridden with `PORT=5001 npm start --prefix backend`.

### What the dashboard does

Open <http://localhost:5173>. You should see the sidebar with `Wishlist` and
`Favorites`, an "Add item" button, and a "Run price check" action.

If the dashboard needs to talk to a non-default backend URL, create
`dashboard/.env.local`:

```
VITE_API_BASE=http://localhost:5001
```

To produce a static build:

```bash
npm run build                           # from repo root
# or: npm run build --prefix dashboard
npm run preview --prefix dashboard      # serves the build locally
```

---

## 3. Load the Chrome extension

1. Open <chrome://extensions> in Chrome.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select the `extension/` folder.
4. Pin the extension and click its icon to open the popup.

The popup auto-populates from the active tab via `content.js` (Open Graph
tags, `itemprop="price"`, etc.) and stores items in `chrome.storage.local`.
Clicking **Sync now** in the footer pushes them to the backend at
`http://localhost:4000` and pulls back any price updates.

> The manifest's `host_permissions` are scoped to `http://localhost:4000/*`.
> If you change the backend URL, update `extension/manifest.json` and reload
> the extension.

### (Optional) Regenerate icons

```bash
cd extension
pip install pillow
python3 make_icons.py
```

This rewrites `extension/icons/icon{16,32,48,128}.png`.

---

## Typical end-to-end flow

1. `npm install` at the repo root (installs backend + dashboard).
2. `npm run dev` at the repo root — API on `:4000`, dashboard on `:5173`.
3. Load `extension/` as an unpacked extension in Chrome.
4. Visit a product page, click the extension icon, save the item to a list.
5. Hit **Sync now** in the popup, then refresh the dashboard — the item
   appears with a price-history chart that grows as the cron job logs new
   prices.

---

## Project layout

```
cartwatch/
├── backend/
│   ├── src/
│   │   ├── server.js         # Express app + routes
│   │   ├── repo.js           # SQLite data layer
│   │   ├── db.js             # schema + migrations + default lists
│   │   └── priceMonitor.js   # cron-driven price checker (Cheerio scraper)
│   └── data.sqlite           # created at first run (gitignored)
├── dashboard/
│   ├── src/
│   │   ├── App.jsx, main.jsx, store.jsx, api.js
│   │   ├── pages/            # Items, ItemDetail, Settings
│   │   └── components/       # AddItemModal, ItemCard
│   └── vite.config.js        # dev server on :5173
└── extension/
    ├── manifest.json         # MV3, host permission for :4000
    ├── popup.html/.js/.css   # save form + lists tabs
    ├── content.js            # scrapes product metadata from the active page
    ├── background.js         # service worker
    ├── storage.js, sync.js   # chrome.storage + backend sync
    └── icons/                # PNGs generated by make_icons.py
```

---

## Notes & current limitations

- **Price scraping is best-effort.** `priceMonitor.js` fetches each item's
  `productLink` and reads the price from JSON-LD `Product.offers`, common
  `<meta>` tags (`product:price:amount`, `og:price:amount`), `itemprop="price"`,
  and `data-price`. Items without a `productLink`, or whose pages don't expose
  any of those signals, are skipped (no fake updates). Sites that gate behind
  JS rendering or aggressive bot detection won't work — consider per-store
  selectors or a headless browser when you outgrow this.
- **Local-only, no auth.** The backend listens on `localhost` and tags every
  row with `user_id = 'local'`. Don't expose it publicly as-is.
- **SQLite lives next to the server** at `backend/data.sqlite` (gitignored).
  Delete it to reset state.

---

## Troubleshooting

- **`better-sqlite3` install fails** — make sure you're on Node 18+ and have
  build tools available (`xcode-select --install` on macOS, `build-essential`
  on Linux, "Desktop development with C++" on Windows).
- **Dashboard shows "Is the backend running on http://localhost:4000?"** —
  start the backend, or set `VITE_API_BASE` in `dashboard/.env.local` to the
  right URL.
- **Extension can't sync** — the manifest only allows `http://localhost:4000`.
  Update `host_permissions` in `extension/manifest.json` and reload the
  extension at `chrome://extensions`.
- **Port 4000 already in use** — start the backend with
  `PORT=5001 npm start --prefix backend` and update `VITE_API_BASE` and
  `extension/manifest.json` to match.
- **`npm run dev` says "Missing script"** — make sure you're running it
  from the repo root (where the top-level `package.json` lives), not from a
  parent directory.
