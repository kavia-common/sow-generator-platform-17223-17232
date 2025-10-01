//
//
// PUBLIC_INTERFACE
// Bundled templates registry (legacy).
// Neutralized for the new DOCX generation flow. No external templates are referenced or loaded.
// These functions are retained as no-ops for backward compatibility with existing imports.

/**
 * PUBLIC_INTERFACE
 * getBundledTemplateInfoByType
 * Always returns null because template-based generation is disabled.
 */
export function getBundledTemplateInfoByType() {
  return null;
}

/**
 * PUBLIC_INTERFACE
 * ensureSampleDocxIfMissing
 * Always returns a disabled response. No template probing or transcript fallback occurs.
 */
export async function ensureSampleDocxIfMissing() {
  return { ok: false, kind: "disabled" };
}
