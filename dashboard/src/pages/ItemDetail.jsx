import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { api } from "../api.js";
import { useStore } from "../store.jsx";
import { formatPrice, priceDelta, timeAgo } from "../utils.js";
import AddItemModal from "../components/AddItemModal.jsx";
import ProductImage from "../components/ProductImage.jsx";

// Recharts takes color strings as props, so we resolve the active theme's
// CSS variables to concrete `rgb(...)` values and re-read them whenever the
// `data-theme` attribute on <html> changes.
function readChartColors() {
  if (typeof window === "undefined") return {};
  const cs = getComputedStyle(document.documentElement);
  const c = (name, alpha) => {
    const rgb = cs.getPropertyValue(name).trim();
    if (!rgb) return undefined;
    return alpha != null ? `rgb(${rgb} / ${alpha})` : `rgb(${rgb})`;
  };
  return {
    grid: c("--color-brand-500", 0.15),
    axis: c("--color-ink-faint"),
    label: c("--color-ink-muted"),
    tooltipText: c("--color-ink"),
    tooltipBorder: c("--color-romantic-peach", 0.6),
    line: c("--color-brand-500"),
  };
}

function useChartColors() {
  const [colors, setColors] = useState(readChartColors);
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(readChartColors()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lists, deleteItem, updateItem } = useStore();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const chartColors = useChartColors();
  const [editing, setEditing] = useState(false);

  async function load() {
    try {
      setError(null);
      const data = await api.getItem(id);
      setItem(data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (error) return <div className="text-brand-700">{error}</div>;
  if (!item) return <div className="text-ink-muted">Loading…</div>;

  const list = lists.find((l) => l.id === item.listId);
  const delta = priceDelta(item);
  const data = (item.priceHistory || []).map((p) => ({
    t: new Date(p.checkedAt).getTime(),
    label: new Date(p.checkedAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    price: p.price,
  }));

  const minPrice = data.length ? Math.min(...data.map((d) => d.price)) : item.currentPrice;
  const maxPrice = data.length ? Math.max(...data.map((d) => d.price)) : item.currentPrice;

  return (
    <div className="mx-auto max-w-5xl">
      <Link to={list ? `/lists/${list.id}` : "/items"} className="text-sm text-ink-muted hover:text-brand-600">
        ← Back to {list ? list.name : "items"}
      </Link>

      <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="card overflow-hidden">
          <div className="aspect-square bg-romantic-lime/40">
            <ProductImage
              src={item.imageUrl}
              productLink={item.productLink}
              alt={item.name}
              purchased={item.purchased}
              size="detail"
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex flex-wrap items-start gap-2">
            <h1 className={`font-serif text-xl font-semibold ${item.purchased ? "line-through text-ink-muted" : ""}`}>
              {item.name}
            </h1>
            {item.purchased && (
              <span className="rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">
                Purchased
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            {item.store && <span>{item.store} · </span>}
            saved {timeAgo(item.dateCreated)}
            {list && (
              <>
                {" · "}
                <Link to={`/lists/${list.id}`} className="hover:text-brand-600">{list.name}</Link>
              </>
            )}
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <div className="text-3xl font-bold">{formatPrice(item.currentPrice)}</div>
            {delta && delta.diff !== 0 && (
              <>
                <div className="text-sm text-ink-faint line-through">{formatPrice(item.initialPrice)}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    delta.diff < 0
                      ? "bg-romantic-mint/70 text-ink"
                      : "bg-brand-100 text-brand-700"
                  }`}
                >
                  {delta.diff < 0 ? "↓" : "↑"} {formatPrice(Math.abs(delta.diff))} ({delta.pct.toFixed(1)}%)
                </span>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.productLink && !item.purchased && (
              <a
                href={item.productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Open product →
              </a>
            )}
            <button
              className={`btn ${item.purchased ? "btn-primary" : "btn-ghost"}`}
              onClick={async () => {
                const updated = await updateItem(item.id, { purchased: !item.purchased });
                setItem((prev) => (prev ? { ...prev, ...updated } : prev));
              }}
            >
              {item.purchased ? "Mark as not purchased" : "Mark as purchased"}
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit</button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (confirm(`Delete "${item.name}"?`)) {
                  await deleteItem(item.id);
                  navigate(list ? `/lists/${list.id}` : "/items");
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Price history</h2>
          <div className="text-sm text-ink-muted">
            {data.length} data point{data.length === 1 ? "" : "s"} · low {formatPrice(minPrice)} · high{" "}
            {formatPrice(maxPrice)}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={chartColors.axis} />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke={chartColors.axis}
                domain={[
                  (dataMin) => Math.floor(dataMin * 0.95),
                  (dataMax) => Math.ceil(dataMax * 1.05),
                ]}
                tickFormatter={(v) => formatPrice(v)}
              />
              <Tooltip
                formatter={(v) => formatPrice(v)}
                labelStyle={{ color: chartColors.tooltipText }}
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  background: "rgba(255, 255, 255, 0.9)",
                }}
              />
              <ReferenceLine
                y={item.initialPrice}
                stroke={chartColors.axis}
                strokeDasharray="4 4"
                label={{ value: "initial", fontSize: 10, fill: chartColors.label, position: "right" }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={chartColors.line}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {editing && (
        <AddItemModal
          initial={item}
          onClose={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </div>
  );
}
