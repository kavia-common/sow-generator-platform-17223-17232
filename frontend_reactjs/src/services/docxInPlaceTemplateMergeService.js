//
// PUBLIC_INTERFACE
// docxInPlaceTemplateMergeService
// Uses the exact user-provided DOCX as the base and fills only placeholder tags found in the template.
// Preserves original layout, styles, fonts, headers/footers, numbering, tables, images, etc.
// Unmapped or missing fields remain as blank or original tokens based on the configuration below.

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

// PUBLIC_INTERFACE
export async function loadDocxArrayBuffer(urlOrFile) {
  /**
   * Load a .docx ArrayBuffer from a URL (string) or File/Blob.
   */
  if (!urlOrFile) throw new Error("No DOCX template source provided");
  if (typeof urlOrFile === "string") {
    const res = await fetch(urlOrFile);
    if (!res.ok) throw new Error(`Failed to fetch template: ${res.status}`);
    return await res.arrayBuffer();
  }
  if (typeof File !== "undefined" && urlOrFile instanceof File) {
    return await urlOrFile.arrayBuffer();
  }
  if (typeof Blob !== "undefined" && urlOrFile instanceof Blob) {
    return await urlOrFile.arrayBuffer();
  }
  throw new Error("Unsupported template source type");
}

// PUBLIC_INTERFACE
export function prepareTemplateData(templateData) {
  /**
   * Convert our templateData into a flat map keyed by normalized names,
   * but also include original keys to match docxtemplater tag names exactly when possible.
   */
  const flat = {};
  function put(k, v) {
    if (v == null) return;
    flat[k] = toStringValue(v);
  }
  // copy as-is
  Object.keys(templateData || {}).forEach((k) => {
    put(k, templateData[k]);
  });

  // include normalized variants for convenience
  Object.keys(templateData || {}).forEach((k) => {
    put(normalizeKey(k), templateData[k]);
  });

  // Do not inject aliases or defaults. Only flatten known nested authorization_signatures with dotted keys,
  // so templates that explicitly reference authorization_signatures.* can resolve. No extra aliasing.
  const auth = (templateData && templateData.authorization_signatures) || {};
  Object.keys(auth).forEach((k) => {
    if (auth[k] != null) {
      put(`authorization_signatures.${k}`, auth[k]);
    }
  });

  return flat;
}

// PUBLIC_INTERFACE
export function mergeDocxWithData(docxArrayBuffer, dataMap, options = {}) {
  /**
   * Perform in-place merge using docxtemplater.
   * - dataMap: key-value pairs for tags in the template
   * - options.keepUnfilledTags: if true, keep tags untouched when missing; if false, blank them
   * - options.delimiters: allow custom tag delimiters if needed (default {{ }})
   */
  const { keepUnfilledTags = true, delimiters } = options;

  const zip = new PizZip(docxArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: false,
    linebreaks: false,
    nullGetter: () => {
      // When docxtemplater cannot find a key (undefined) it calls nullGetter.
      // Requirement: "Only placeholder fields matching the template are replaced; all others remain blank."
      // And "Unfilled fields must remain blank/untouched."
      // We choose to leave tag text intact if keepUnfilledTags, else return '' (blank).
      if (keepUnfilledTags) {
        // returning undefined tells docxtemplater to keep the original tag text
        return undefined;
      }
      // return empty string to blank-out the tag content but keep formatting
      return "";
    },
    delimiters, // optional: { start:'{{', end:'}}' }
  });

  // setData expects exact keys that match the template's tags; we pass our map directly.
  doc.setData(dataMap || {});
  try {
    doc.render();
  } catch (e) {
    // surface docxtemplater detailed error if available
    const reason = (e && e.properties && e.properties.errors && e.properties.errors.map((er) => er.properties && er.properties.explanation).join("\n")) || e.message || String(e);
    throw new Error(`DOCX render failed: ${reason}`);
  }
  const out = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  return out;
}

// PUBLIC_INTERFACE
export function normalizeKey(label) {
  /** Normalize keys loosely to help map labels to keys */
  return String(label || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toStringValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(toStringValue).join(", ");
  if (typeof v === "object") {
    try {
      return Object.keys(v).map((k) => `${k}: ${toStringValue(v[k])}`).join("; ");
    } catch {
      return JSON.stringify(v);
    }
  }
  return String(v);
}
