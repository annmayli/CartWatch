// CartWatch color themes.
// Each theme overrides the same CSS variable slots (defined in index.css).
// `swatch` colors are used by the picker UI to show a preview.
//
// Keep this list in sync with `extension/themes.js` and the CSS blocks in
// `dashboard/src/index.css` + `extension/popup.css`.

export const THEMES = [
  {
    id: "romantic",
    label: "Romantic",
    swatch: ["#E3919F", "#F2C0BD", "#BBDDCE"],
  },
  {
    id: "ocean",
    label: "Ocean",
    swatch: ["#5FA3D0", "#B8DDF2", "#B5E3D4"],
  },
  {
    id: "sunset",
    label: "Sunset",
    swatch: ["#F0876A", "#FCC6A3", "#FFEFC4"],
  },
  {
    id: "lavender",
    label: "Lavender",
    swatch: ["#B89AD6", "#E8C5DD", "#CDDCC1"],
  },
];

export const DEFAULT_THEME = "romantic";

export function applyTheme(themeId) {
  const id = THEMES.some((t) => t.id === themeId) ? themeId : DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", id);
  return id;
}
