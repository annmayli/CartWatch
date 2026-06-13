import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const StoreCtx = createContext(null);

const SETTINGS_KEY = "wishlist-settings";
const defaultSettings = {
  monitoringEnabled: true,
  frequency: "daily",
  emailAlerts: false,
  cloudSync: true,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function StoreProvider({ children }) {
  const [items, setItems] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [l, i] = await Promise.all([api.listLists(), api.listItems()]);
      setLists(l);
      setItems(i);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    items,
    lists,
    loading,
    error,
    settings,
    setSettings,
    refresh,
    async createList(name) {
      const l = await api.createList(name);
      setLists((prev) => [...prev, l]);
      return l;
    },
    async renameList(id, name) {
      const l = await api.renameList(id, name);
      setLists((prev) => prev.map((x) => (x.id === id ? l : x)));
    },
    async deleteList(id) {
      await api.deleteList(id);
      setLists((prev) => prev.filter((x) => x.id !== id));
      setItems((prev) => prev.filter((x) => x.listId !== id));
    },
    async createItem(input) {
      const it = await api.createItem(input);
      setItems((prev) => [it, ...prev]);
      await refresh(); // refresh list counts
      return it;
    },
    async updateItem(id, patch) {
      const it = await api.updateItem(id, patch);
      setItems((prev) => prev.map((x) => (x.id === id ? it : x)));
      await refresh();
      return it;
    },
    async deleteItem(id) {
      await api.deleteItem(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      await refresh();
    },
    async runPriceCheck() {
      const r = await api.triggerPriceCheck();
      await refresh();
      return r;
    },
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}
