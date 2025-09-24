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
    background: "#FDF2F8", // rose-50
    surface: "#FFFFFF",
    text: "#374151" // gray-700
  },
  gradient: "linear-gradient(135deg, #FFE4E6 0%, #F3E8FF 100%)" // rose-50 to purple-50
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
}
