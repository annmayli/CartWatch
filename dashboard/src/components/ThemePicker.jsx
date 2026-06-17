import React from "react";
import { useStore } from "../store.jsx";
import { THEMES } from "../themes.js";

export default function ThemePicker() {
  const { settings, setSettings } = useStore();
  const current = settings.theme;

  return (
    <div className="px-1">
      <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Theme
      </div>
      <div className="flex flex-wrap gap-1.5 px-1">
        {THEMES.map((t) => {
          const active = t.id === current;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSettings((s) => ({ ...s, theme: t.id }))}
              title={t.label}
              aria-label={`Use ${t.label} theme`}
              aria-pressed={active}
              className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                active
                  ? "border-brand-600 ring-2 ring-brand-500/40"
                  : "border-white/70 hover:border-brand-500/60"
              }`}
              style={{
                background: `linear-gradient(135deg, ${t.swatch[0]} 0%, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%, ${t.swatch[1]} 75%, ${t.swatch[2]} 75%)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
