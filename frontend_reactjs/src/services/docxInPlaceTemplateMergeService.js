//
// PUBLIC_INTERFACE
// docxInPlaceTemplateMergeService
// Uses the exact user-provided DOCX as the base and fills only placeholder tags found in the template.
// Preserves original layout, styles, fonts, headers/footers, numbering, tables, images, etc.
// Unmapped or missing fields remain as blank or original tokens based on the configuration below.

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

/**
 * PUBLIC_INTERFACE
 * loadDocxArrayBuffer
 * Load a .docx ArrayBuffer from a URL (string) or File/Blob with strict validation.
 * Ensures the file is a binary DOCX (ZIP package) and not a .txt transcript or corrupted upload.
 */
export async function loadDocxArrayBuffer(urlOrFile) {
  if (!urlOrFile) throw new Error("No DOCX template source provided");

  // Helper: verify header bytes correspond to a ZIP (PK\x03\x04 at start)
  function isZipLocalFileHeader(u8) {
    if (!u8 || u8.length < 4) return false;
    return u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 0x03 && u8[3] === 0x04;
  }

  // Helper: validate mime/extension hints when available
  function looksLikeDocx(name, type) {
    const lower = (name || "").toLowerCase();
    const t = (type || "").toLowerCase();
    const extOk = lower.endsWith(".docx");
    const mimeOk =
      t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      t === "application/zip" ||
      t === "application/octet-stream" ||
      t === "application/x-zip-compressed";
    // Accept if either extension is .docx or mime hints at zip/docx
    return extOk || mimeOk;
  }

  let nameHint = "";
  let typeHint = "";

  if (typeof urlOrFile === "string") {
    nameHint = urlOrFile.split("?")[0].split("#")[0];
    const res = await fetch(urlOrFile);
    if (!res.ok) throw new Error(`Failed to fetch template: ${res.status}`);
    // Try to infer content-type header
    typeHint = res.headers.get("content-type") || "";
    const ab = await res.arrayBuffer();
    const u8 = new Uint8Array(ab);
    if (!isZipLocalFileHeader(u8)) {
      // Provide actionable help for common mistake of uploading .txt transcript
      const hintExt = nameHint.toLowerCase().endsWith(".txt") ? " The selected file appears to be a .txt transcript, not a .docx." : "";
      throw new Error(
        "Invalid DOCX file: Not a valid ZIP package. Ensure you upload the original .docx (binary) template, not a text transcript." + hintExt
      );
    }
    if (!looksLikeDocx(nameHint, typeHint)) {
      // Not fatal if header is ZIP, but we can warn in message logs; proceed silently.
    }
    return ab;
  }

  if (typeof File !== "undefined" && urlOrFile instanceof File) {
    nameHint = urlOrFile.name || "";
    typeHint = urlOrFile.type || "";
    if (!looksLikeDocx(nameHint, typeHint)) {
      throw new Error(
        "Unsupported template file: Please upload a .docx file exported from Word/Google Docs. Text transcripts (.txt) are not supported for merging."
      );
    }
    const ab = await urlOrFile.arrayBuffer();
    const u8 = new Uint8Array(ab);
    if (!isZipLocalFileHeader(u8)) {
      throw new Error(
        "Invalid DOCX file: The uploaded file is not a valid .docx (ZIP) package. Please re-export and upload the original .docx."
      );
    }
    return ab;
  }

  if (typeof Blob !== "undefined" && urlOrFile instanceof Blob) {
    nameHint = ""; // Blob may not include name
    typeHint = urlOrFile.type || "";
    const ab = await urlOrFile.arrayBuffer();
    const u8 = new Uint8Array(ab);
    if (!isZipLocalFileHeader(u8)) {
      throw new Error(
        "Invalid DOCX file: Blob is not a valid .docx (ZIP) package."
      );
    }
    return ab;
  }

  throw new Error("Unsupported template source type");
}

// PUBLIC_INTERFACE
export function prepareTemplateData(templateData) {
  /**
   * Convert user-entered templateData into a flat data map that will be passed to docxtemplater.
   * Requirements:
   * - Map every entered form value to a tag (exact key and normalized variant).
   * - Only include fields that have input (non-empty after stringification).
   * - Support nested authorization_signatures.* via dotted keys.
   */
  const out = {};
  const src = templateData || {};

  function hasInput(v) {
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return true;
  }
  function putIfHasInput(k, v) {
    if (!hasInput(v)) return;
    out[k] = toStringValue(v);
  }

  // Copy exact keys that have input
  Object.keys(src).forEach((k) => {
    putIfHasInput(k, src[k]);
  });

  // Provide normalized variants for convenience (maps to {{normalized_key}} tags)
  Object.keys(src).forEach((k) => {
    putIfHasInput(normalizeKey(k), src[k]);
  });

  // Flatten nested authorization_signatures.* only for provided sub-keys
  const auth = src.authorization_signatures || {};
  Object.keys(auth).forEach((k) => {
    putIfHasInput(`authorization_signatures.${k}`, auth[k]);
  });

  return out;
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
