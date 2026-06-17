// Toggles for in-progress UI. Set `VITE_ENABLE_SETTINGS=true` in a `.env.local`
// (or your shell) to expose the Settings page while it's being built out.
// Defaults to hidden so users don't see non-functional controls.
export const SETTINGS_ENABLED = import.meta.env.VITE_ENABLE_SETTINGS === "true";
