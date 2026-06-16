import { detectProduct } from "./pickProductImage.js";

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg, _sender, send) => {
    if (msg?.type === "wishlist:detect") {
      send(detectProduct());
      return true;
    }
  });
}
