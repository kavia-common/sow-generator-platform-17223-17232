//
// Ocean Professional theme constants and helpers
//

export const oceanTheme = {
  name: "Ocean Professional",
  colors: {
    primary: "#F472B6",   // rose-400
    secondary: "#F59E0B", // amber-500
    success: "#10B981",   // emerald-500
    error: "#EF4444",     // red-500
    background: "#FFFFFF",
    surface: "#FFFFFF",
    text: "#111827" // gray-900
  },
  gradient: "linear-gradient(135deg, #FFE4E6 0%, #F3E8FF 100%)"
};

// PUBLIC_INTERFACE
export function applyThemeToRoot(theme = oceanTheme) {
  /**
   * Apply theme CSS variables at runtime to documentElement.
   * It enables dynamic theming without external CSS frameworks.
   */
  const root = document.documentElement;
  const { colors } = theme;
  root.style.setProperty("--ocn-bg", colors.background);
  root.style.setProperty("--ocn-surface", colors.surface);
  root.style.setProperty("--ocn-text", colors.text);
  root.style.setProperty("--ocn-primary", colors.primary);
  root.style.setProperty("--ocn-secondary", colors.secondary);
  root.style.setProperty("--ocn-success", colors.success);
  root.style.setProperty("--ocn-error", colors.error);
  root.style.setProperty("--ocn-gradient", theme.gradient);

  // Sync core tokens consumed by styles.css/theme.css
  root.style.setProperty("--bg-canvas", colors.background);
  root.style.setProperty("--bg-elevated", colors.surface);
  root.style.setProperty("--text-primary", colors.text);
  root.style.setProperty("--text-secondary", "#374151");
  root.style.setProperty("--ui-border", "#E5E7EB");
  root.style.setProperty("--ui-border-strong", "#D1D5DB");
}
