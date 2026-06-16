import { db } from "./db.js";
import { repo } from "./repo.js";
import { resolveProductImageUrl } from "./imageUrl.js";
import { fetchProductImageUrl } from "./fetchProductImage.js";

export async function repairMissingItemImages({ verbose = false } = {}) {
  const rows = db
    .prepare(
      `SELECT id, image_url, product_link FROM items
       WHERE product_link IS NOT NULL AND TRIM(product_link) != ''`
    )
    .all();

  let repaired = 0;
  for (const row of rows) {
    if (resolveProductImageUrl(row.image_url, row.product_link)) continue;
    const url = await fetchProductImageUrl(row.product_link);
    if (!url) {
      if (verbose) console.warn(`[image-repair] no image found for item ${row.id}`);
      continue;
    }
    repo.updateItem(row.id, { imageUrl: url });
    repaired++;
    if (verbose) console.log(`[image-repair] fixed item ${row.id}`);
  }
  if (verbose) console.log(`[image-repair] repaired ${repaired} item(s)`);
  return { repaired };
}
