/**
 * PUBLIC_INTERFACE
 * getDarkTheme
 * This module defines a unified dark theme token set for the application.
 * Consume these tokens to keep a consistent near-black look across components.
 */
export function getDarkTheme() {
  /** This returns dark theme tokens. */
  return {
    background: '#0b0b0d',
    surface: '#131317',
    surface2: '#1a1a20',
    text: '#eaeaf0',
    textMuted: '#b8b8c7',
    border: '#2a2a33',
    divider: '#23232b',
    primary: '#F472B6',
    primaryContrast: '#101014',
    secondary: '#F59E0B',
    success: '#10B981',
    error: '#EF4444',
    link: '#93c5fd',
    linkHover: '#bfdbfe',
    inputBg: '#101014',
    inputBgFocus: '#0d0d12',
    inputText: '#eaeaf0',
    inputPlaceholder: '#8c8ca0',
    inputBorder: '#2a2a33',
    inputBorderFocus: '#4b4b5e',
  };
}

/**
 * PUBLIC_INTERFACE
 * oceanTheme
 * Backwards compatible export expected by existing pages; mapped to our dark palette.
 */
export const oceanTheme = getDarkTheme();

/**
 * PUBLIC_INTERFACE
 * applyThemeToRoot
 * Applies the provided theme tokens to the :root via CSS variables to ensure global styling.
 * This function safely no-ops on non-browser environments.
 */
export function applyThemeToRoot(theme) {
  if (typeof document === 'undefined') return;
  const t = theme || getDarkTheme();
  const root = document.documentElement;
  // Map JS tokens to CSS custom properties defined in theme.css
  const mapping = {
    '--color-bg': t.background,
    '--color-surface': t.surface,
    '--color-surface-2': t.surface2,
    '--color-text': t.text,
    '--color-text-muted': t.textMuted,
    '--color-border': t.border,
    '--color-divider': t.divider,
    '--color-primary': t.primary,
    '--color-primary-contrast': t.primaryContrast,
    '--color-secondary': t.secondary,
    '--color-success': t.success,
    '--color-error': t.error,
    '--link': t.link,
    '--link-hover': t.linkHover,
    '--input-bg': t.inputBg,
    '--input-bg-focus': t.inputBgFocus,
    '--input-text': t.inputText,
    '--input-placeholder': t.inputPlaceholder,
    '--input-border': t.inputBorder,
    '--input-border-focus': t.inputBorderFocus,
    // Tables
    '--table-header-bg': '#16161c',
    '--table-row-bg': '#121217',
    '--table-row-alt-bg': '#15151b',
    '--table-row-hover-bg': '#1e1e26',
    // Focus ring as a consistent accessible outline
    '--focus-ring': '2px solid rgba(96, 165, 250, 0.6)',
    '--hover-surface': '#1f1f27',
    '--active-surface': '#252531',
    // Shadows
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.4)',
    '--shadow-md': '0 4px 10px rgba(0,0,0,0.45)',
    '--shadow-lg': '0 10px 25px rgba(0,0,0,0.5)',
  };
  Object.entries(mapping).forEach(([k, v]) => root.style.setProperty(k, v));
}

export default getDarkTheme;
