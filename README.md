# CartWatch

Save products from any online store and track how their prices change over time.

## Dashboard
![CartWatch dashboard](docs/dashboard.png)

The dashboard includes:
- Browse items across all lists or filter to a specific list (e.g. Clothing, Wishlist)
- See current price, original price, and badges when a price has changed
- Search items by name or store
- Open an item for details, a price-history chart, and a link back to the product page
- Add items manually, move them between lists, or trigger a price check

A Chrome extension is also available for saving products while you browse. After syncing, items show up in the dashboard.

## How to run it

**Prerequisites:** Node.js 18+ and npm. Chrome if you want the extension.
```bash
npm install
npm run dev
```

This starts:
- Backend API at http://localhost:4000
- Dashboard at http://localhost:5173

On first run the backend creates backend/data.sqlite and seeds default lists (Wishlist and Favorites). Price checks run shortly after startup and every 15 minutes.

To run the servers separately:

```bash
npm run dev:backend
npm run dev:dashboard
```

Load the extension (optional)
1. Open chrome://extensions and turn on Developer mode
2. Click Load unpacked and select the extension/ folder
3. Save a product from a store page, click Sync now, then refresh the dashboard

Typical flow
1. npm install and npm run dev
2. Load the extension
3. Save a product from a store page
4. Sync and view it in the dashboard — the price history updates as checks run

## Project structure

| Folder       | What it is                            |
| ------------ | ------------------------------------- |
| `backend/`   | REST API + SQLite store + price cron  |
| `dashboard/` | Web UI for browsing items and charts  |
| `extension/` | Chrome extension for one-click saves  |

The dashboard and extension both talk to the backend at `http://localhost:4000`.

Notes
- Price scraping is best-effort — it reads common price signals from product page
- (JSON-LD, meta tags, etc.). Sites with heavy JS or bot protection may not work.
- Local-only, no auth. The backend is meant to run on localhost.
- Delete backend/data.sqlite to reset all data.