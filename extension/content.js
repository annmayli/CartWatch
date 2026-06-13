// Content script: looks for product info on the page so the popup can pre-fill it.
// Future enhancement: surface a floating "Save to Wishlist" button on detected product pages.

(function () {
  function detectProduct() {
    const og = (p) => document.querySelector(`meta[property="og:${p}"]`)?.content;
    const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content;

    // Common heuristics; actual scraping per-store would be a future enhancement.
    const priceText =
      document.querySelector('[itemprop="price"]')?.getAttribute("content") ||
      document.querySelector('[data-price]')?.getAttribute("data-price") ||
      meta("product:price:amount");

    return {
      title: og("title") || document.title,
      image: og("image"),
      url: location.href,
      price: priceText ? parseFloat(priceText) : null,
    };
  }

  // Respond to popup requests.
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, send) => {
      if (msg?.type === "wishlist:detect") {
        send(detectProduct());
        return true;
      }
    });
  }
})();
