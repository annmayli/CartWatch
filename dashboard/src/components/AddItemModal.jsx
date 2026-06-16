import React, { useEffect, useState } from "react";
import { useStore } from "../store.jsx";
import { isUsableProductImageUrl, normalizeImageUrl, resolveProductImageUrl, tryDetectStore } from "../utils.js";

export default function AddItemModal({ onClose, initial }) {
  const { lists, createItem, updateItem } = useStore();
  const editing = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    imageUrl: initial?.imageUrl || "",
    productLink: initial?.productLink || "",
    initialPrice: initial?.initialPrice ?? "",
    currentPrice: initial?.currentPrice ?? "",
    listId: initial?.listId || lists[0]?.id || "",
    store: initial?.store || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  const previewUrl = resolveProductImageUrl(form.imageUrl, form.productLink);

  useEffect(() => {
    setPreviewFailed(false);
  }, [form.imageUrl]);

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "productLink" && !next.store) next.store = tryDetectStore(value);
      if (field === "initialPrice" && !editing && next.currentPrice === "") {
        next.currentPrice = value;
      }
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim() || !form.listId) {
      setErr("Name and list are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        imageUrl: resolveProductImageUrl(form.imageUrl, form.productLink) || "",
        initialPrice: parseFloat(form.initialPrice) || 0,
        currentPrice:
          form.currentPrice === "" ? parseFloat(form.initialPrice) || 0 : parseFloat(form.currentPrice),
      };
      if (editing) await updateItem(initial.id, payload);
      else await createItem(payload);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-serif text-lg font-semibold">{editing ? "Edit item" : "Save a product"}</h2>
          <button onClick={onClose} className="btn btn-ghost p-1">×</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Product name</label>
            <input
              className="input"
              autoFocus
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Sony WH-1000XM5"
            />
          </div>
          <div>
            <label className="label">Product link</label>
            <input
              className="input"
              value={form.productLink}
              onChange={(e) => update("productLink", e.target.value)}
              placeholder="https://store.example.com/product"
            />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input
              className="input"
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              placeholder="https://..."
            />
            {previewUrl ? (
              <div className="mt-2 overflow-hidden rounded-lg border border-romantic-peach/50 bg-romantic-lime/30">
                {!previewFailed ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="mx-auto max-h-40 w-full object-contain"
                    onError={() => setPreviewFailed(true)}
                  />
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-brand-700">
                    URL saved, but this image couldn't be loaded (broken link or hotlink blocking).
                  </p>
                )}
              </div>
            ) : form.imageUrl.trim() ? (
              <p className="mt-1 text-xs text-brand-700">Enter a valid http(s) image URL.</p>
            ) : null}
            {previewUrl && !previewFailed && !isUsableProductImageUrl(form.imageUrl, form.productLink) && (
              <p className="mt-1 text-xs text-ink-muted">This URL looks like a logo or icon, not a product photo.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Initial price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.initialPrice}
                onChange={(e) => update("initialPrice", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Current price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.currentPrice}
                onChange={(e) => update("currentPrice", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">List</label>
              <select
                className="input"
                value={form.listId}
                onChange={(e) => update("listId", e.target.value)}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Store</label>
              <input
                className="input"
                value={form.store}
                onChange={(e) => update("store", e.target.value)}
                placeholder="auto-detected"
              />
            </div>
          </div>

          {err && <div className="text-sm text-brand-700">{err}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Save item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
