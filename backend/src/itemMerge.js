import { pickImageUrl } from "./imageUrl.js";

/** Merge an extension/client item into an existing server row without clobbering dashboard edits. */
export function mergeIncomingItem(server, client) {
  const productLink = client.productLink || server.productLink;
  return {
    ...client,
    imageUrl: pickImageUrl(server.imageUrl, client.imageUrl, productLink),
    purchased: server.purchased,
    currentPrice: server.currentPrice,
    lastPriceCheck: server.lastPriceCheck,
    initialPrice: server.initialPrice,
  };
}
