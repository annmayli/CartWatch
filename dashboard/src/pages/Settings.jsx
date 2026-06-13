import React from "react";
import { useStore } from "../store.jsx";

export default function Settings() {
  const { settings, setSettings, runPriceCheck } = useStore();

  function update(patch) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-slate-500">Configure how the price tracker behaves.</p>
      </div>

      <Section title="Price monitoring">
        <Toggle
          label="Enable automatic price checks"
          description="Backend cron job re-fetches prices on a schedule."
          checked={settings.monitoringEnabled}
          onChange={(v) => update({ monitoringEnabled: v })}
        />
        <Field label="Check frequency">
          <select
            className="input"
            value={settings.frequency}
            onChange={(e) => update({ frequency: e.target.value })}
            disabled={!settings.monitoringEnabled}
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily (recommended)</option>
            <option value="weekly">Weekly</option>
          </select>
        </Field>
        <button className="btn btn-primary" onClick={async () => {
          const r = await runPriceCheck();
          alert(`Checked ${r.checked} items, ${r.updated} prices updated.`);
        }}>
          Run check now
        </button>
      </Section>

      <Section title="Notifications">
        <Toggle
          label="Email alerts on price drop"
          description="Sends an email when an item drops more than 5% from its initial price."
          checked={settings.emailAlerts}
          onChange={(v) => update({ emailAlerts: v })}
        />
      </Section>

      <Section title="Privacy & sync">
        <Toggle
          label="Cloud sync"
          description="Persist items in the backend database. Disabling keeps everything local in the extension."
          checked={settings.cloudSync}
          onChange={(v) => update({ cloudSync: v })}
        />
      </Section>

      <p className="text-xs text-slate-500">
        Settings are stored locally in this browser. Backend is at{" "}
        <code>{import.meta.env.VITE_API_BASE || "http://localhost:4000"}</code>.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-slate-500">{description}</div>}
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}
