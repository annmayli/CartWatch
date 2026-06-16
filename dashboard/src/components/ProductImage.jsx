import React, { useEffect, useState } from "react";
import { resolveProductImageUrl } from "../utils.js";

export default function ProductImage({
  src,
  productLink,
  alt,
  className = "",
  imgClassName = "h-full w-full object-cover",
  purchased = false,
  size = "card",
}) {
  const [failed, setFailed] = useState(false);
  const url = resolveProductImageUrl(src, productLink);

  useEffect(() => {
    setFailed(false);
  }, [src, productLink]);

  const placeholder = (
    <div
      className={`flex h-full flex-col items-center justify-center gap-1 bg-romantic-lime/40 p-3 text-center ${
        size === "detail" ? "min-h-[200px] text-sm" : "min-h-[120px] text-xs"
      } text-ink-muted ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={size === "detail" ? "h-10 w-10 text-romantic-peach" : "h-8 w-8 text-romantic-peach"}
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10.5" r="1.5" />
        <path d="M21 16l-5.5-5.5L8 18" />
      </svg>
      <span>{url && failed ? "Image couldn't load" : "No image"}</span>
    </div>
  );

  if (!url || failed) return placeholder;

  return (
    <img
      src={url}
      alt={alt}
      className={`${imgClassName} ${purchased ? "grayscale" : ""} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
