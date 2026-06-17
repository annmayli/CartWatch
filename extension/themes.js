// CartWatch theme palettes for the extension popup.
// Keep slots in sync with `dashboard/src/themes.js` and the CSS blocks
// in `extension/popup.css` + `dashboard/src/index.css`.

export const THEMES = [
  { id: "romantic", label: "Romantic", swatch: ["#E3919F", "#F2C0BD", "#BBDDCE"] },
  { id: "ocean", label: "Ocean", swatch: ["#5FA3D0", "#B8DDF2", "#B5E3D4"] },
  { id: "sunset", label: "Sunset", swatch: ["#F0876A", "#FCC6A3", "#FFEFC4"] },
  { id: "lavender", label: "Lavender", swatch: ["#B89AD6", "#E8C5DD", "#CDDCC1"] },
];

export const DEFAULT_THEME = "romantic";
export const THEME_KEY = "wishlist-theme";

function isValidId(id) {
  return THEMES.some((t) => t.id === id);
}

// Theme is a pure UI preference, so we keep it in localStorage only — that
// gives synchronous reads, which lets the inline script in popup.html paint
// the right palette on first frame (no flash of default theme).
export function loadTheme() {
  try {
    const id = localStorage.getItem(THEME_KEY);
    return isValidId(id) ? id : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(id) {
  const themeId = isValidId(id) ? id : DEFAULT_THEME;
  try {
    localStorage.setItem(THEME_KEY, themeId);
  } catch {
    // storage unavailable — runtime change still works for this session
  }
  return themeId;
}

export function applyTheme(id) {
  const themeId = isValidId(id) ? id : DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", themeId);
  return themeId;
}
