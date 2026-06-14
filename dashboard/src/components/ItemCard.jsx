import React from "react";
import { Link } from "react-router-dom";
import { formatPrice, priceDelta, timeAgo } from "../utils.js";

export default function ItemCard({ item, onEdit, onDelete, onMove, lists }) {
  const delta = priceDelta(item);
  const fellHard = delta && delta.diff < 0;
  const rose = delta && delta.diff > 0;

  return (
    <div className="card group flex flex-col overflow-hidden">
      <Link
        to={`/items/${item.id}`}
        className="relative block aspect-square overflow-hidden bg-romantic-lime/40"
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-romantic-peach">
            
          </div>
        )}
        {delta && delta.diff !== 0 && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold shadow ${
              fellHard
                ? "bg-romantic-mint text-ink"
                : rose
                ? "bg-brand-600 text-white"
                : "bg-ink-muted text-white"
            }`}
          >
            {fellHard ? "↓" : "↑"} {formatPrice(Math.abs(delta.diff))}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link to={`/items/${item.id}`} className="line-clamp-2 text-sm font-medium hover:text-brand-600">
          {item.name}
        </Link>
        <div className="text-xs text-ink-muted">
          {item.store ? `${item.store} · ` : ""}saved {timeAgo(item.dateCreated)}
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="text-lg font-semibold">{formatPrice(item.currentPrice)}</div>
            {delta && delta.diff !== 0 && (
              <div className="text-xs text-ink-faint line-through">
                {formatPrice(item.initialPrice)}
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button className="btn btn-ghost p-1.5" title="Edit" onClick={() => onEdit(item)}>
              <Pencil />
            </button>
            <select
              title="Move to list"
              className="rounded-md border border-romantic-peach/50 bg-white/80 px-1 py-1 text-xs"
              value={item.listId}
              onChange={(e) => onMove(item, e.target.value)}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <button className="btn btn-danger p-1.5" title="Delete" onClick={() => onDelete(item)}>
              <Trash />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Pencil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const Trash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <path d="M3 6h18M8 6V4h8v2m-9 0v14h10V6" />
  </svg>
);
