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

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lists, deleteItem } = useStore();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
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

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!item) return <div className="text-slate-500">Loading…</div>;

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
      <Link to={list ? `/lists/${list.id}` : "/items"} className="text-sm text-slate-500 hover:text-brand-600">
        ← Back to {list ? list.name : "items"}
      </Link>

      <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr]">
        <div className="card overflow-hidden">
          <div className="aspect-square bg-slate-100 dark:bg-slate-800">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl text-slate-300"></div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h1 className="text-xl font-semibold">{item.name}</h1>
          <div className="mt-1 text-sm text-slate-500">
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
                <div className="text-sm text-slate-500 line-through">{formatPrice(item.initialPrice)}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    delta.diff < 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                  }`}
                >
                  {delta.diff < 0 ? "↓" : "↑"} {formatPrice(Math.abs(delta.diff))} ({delta.pct.toFixed(1)}%)
                </span>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {item.productLink && (
              <a
                href={item.productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Open product →
              </a>
            )}
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
          <div className="text-sm text-slate-500">
            {data.length} data point{data.length === 1 ? "" : "s"} · low {formatPrice(minPrice)} · high{" "}
            {formatPrice(maxPrice)}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                domain={[
                  (dataMin) => Math.floor(dataMin * 0.95),
                  (dataMax) => Math.ceil(dataMax * 1.05),
                ]}
                tickFormatter={(v) => formatPrice(v)}
              />
              <Tooltip
                formatter={(v) => formatPrice(v)}
                labelStyle={{ color: "#0f172a" }}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <ReferenceLine
                y={item.initialPrice}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{ value: "initial", fontSize: 10, fill: "#64748b", position: "right" }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#7c5cff"
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
