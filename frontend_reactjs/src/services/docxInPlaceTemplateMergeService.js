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

/**
 * Convert dataURL (image/*) to Uint8Array bytes and extension/mime.
 */
function dataUrlToBytes(dataUrl) {
  const [head, b64] = String(dataUrl || '').split(',');
  const match = head.match(/data:([^;]+);base64/);
  const mime = (match && match[1]) || 'image/png';
  const ext = mime.split('/')[1] || 'png';
  const bin = atob(b64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, ext, mime };
}

// PUBLIC_INTERFACE
export function prepareTemplateData(templateData, meta = {}) {
  /**
   * Convert user-entered templateData into a flat data map that will be passed to docxtemplater.
   * Requirements:
   * - Map every entered form value to a tag (exact key and normalized variant).
   * - Only include fields that have input (non-empty after stringification).
   * - Support nested authorization_signatures.* via dotted keys.
   * - Introduce {{logo}} and {{signature}} placeholders if present (strings preserved for text engine; image module reads from meta).
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

  // Image placeholder hints (text keys act as hints; actual image bytes are provided via image module below)
  if (typeof meta.logoUrl === 'string' && meta.logoUrl.trim()) {
    out['logo'] = '[logo]';
  }
  if (typeof src.signature === 'string' && src.signature.trim()) {
    out['signature'] = '[signature]';
  } else if (typeof auth.signature === 'string' && auth.signature.trim()) {
    out['signature'] = '[signature]';
  }

  return out;
}

// PUBLIC_INTERFACE
export function mergeDocxWithData(docxArrayBuffer, dataMap, options = {}) {
  /**
   * Perform in-place merge using docxtemplater.
   * - dataMap: key-value pairs for tags in the template
   * - options.keepUnfilledTags: if true, keep tags untouched when missing; if false, blank them
   * - options.delimiters: allow custom tag delimiters if needed (default {{ }})
   * - options.images: { logoDataUrl?: string, signatureDataUrl?: string, fallbackLogoUrl?: string, fallbackSignatureUrl?: string }
   * - options.imageSize: { logo: { w: number, h: number }, signature: { w: number, h: number } } in pixels
   */
  const { keepUnfilledTags = true, delimiters, images = {}, imageSize = {} } = options;

  const zip = new PizZip(docxArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: false,
    linebreaks: false,
    nullGetter: () => {
      if (keepUnfilledTags) {
        return undefined;
      }
      return "";
    },
    delimiters,
  });

  // Configure lightweight image handling through the "image" tag convention: {%image}
  // We will intercept "logo" and "signature" placeholders, and when found, inject binary image data.
  const tagToImageDataUrl = async (tag) => {
    const t = String(tag || "").toLowerCase();
    if (t === "logo") {
      if (images.logoDataUrl && /^data:image\//.test(images.logoDataUrl)) return images.logoDataUrl;
      if (images.fallbackLogoUrl) return await fetchAsDataUrl(images.fallbackLogoUrl);
      return null;
    }
    if (t === "signature") {
      if (images.signatureDataUrl && /^data:image\//.test(images.signatureDataUrl)) return images.signatureDataUrl;
      if (images.fallbackSignatureUrl) return await fetchAsDataUrl(images.fallbackSignatureUrl);
      return null;
    }
    return null;
  };

  // Monkey-patch docxtemplater module behaviors by extending its scope manager to resolve images when the tag is used inline.
  // We follow the documented approach of custom module-like hooks via "getRenderedMap" pre-processing.
  const originalGetTags = doc.getTags ? doc.getTags.bind(doc) : null;

  // Precompute map for images so we can set actual binary values before render
  async function applyImagesToDataMap(dm) {
    const next = { ...(dm || {}) };
    const logoUrl = await tagToImageDataUrl("logo");
    const sigUrl = await tagToImageDataUrl("signature");

    // We store special objects for images that docxtemplater can interpret via angularParser/image hooks;
    // here we simply convert to ArrayBuffer-like via Uint8Array to be injected directly with module-compatible type (Buffer/Uint8Array).
    if (logoUrl) {
      const { bytes } = dataUrlToBytes(logoUrl);
      next["logo"] = bytes;
    }
    if (sigUrl) {
      const { bytes } = dataUrlToBytes(sigUrl);
      next["signature"] = bytes;
    }
    return next;
  }

  // Fetch URL and convert to data URL
  async function fetchAsDataUrl(url) {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  }

  // Docxtemplater default does not treat plain Uint8Array as images automatically.
  // We patch resolveImage for our two known tags through a simple custom parser.
  const moduleLike = {
    // PUBLIC_INTERFACE
    // angularParser is called for each tag; when we detect "logo" or "signature", return a function that yields an object with image bytes and size.
    angularParser: (tag) => {
      const t = String(tag).replace(/^[#^/]|[()]/g, "");
      if (t === "logo" || t === "signature") {
        return {
          get: (scope) => {
            const img = scope["logo"] && t === "logo" ? scope["logo"] : scope["signature"] && t === "signature" ? scope["signature"] : null;
            if (!img) return keepUnfilledTags ? undefined : "";
            const size = (t === "logo" ? imageSize.logo : imageSize.signature) || (t === "logo" ? { w: 180, h: 56 } : { w: 240, h: 80 });
            // Return a special object that docxtemplater knows (through default modules) as an image when getImage/getSize are present on scope
            return {
              _type: "image-tag",
              data: img, // Uint8Array
              width: size.w,
              height: size.h,
            };
          },
        };
      }
      return { get: (s) => s[tag] };
    },
    // getImage/getSize allow image injection when scope value is the object returned by angularParser above.
    getImage: (tagValue) => {
      if (tagValue && tagValue._type === "image-tag" && tagValue.data) {
        return tagValue.data;
      }
      return null;
    },
    getSize: (img, tagValue) => {
      if (tagValue && tagValue._type === "image-tag") {
        const cx = tagValue.width || 180;
        const cy = tagValue.height || 56;
        return [cx, cy];
      }
      // default size
      return [180, 56];
    },
  };

  // Attach our module-like behaviors
  if (doc.attachModule) {
    doc.attachModule(moduleLike);
  }

  // setData expects exact keys that match the template's tags; we pass our map directly with image bytes embedded
  // Ensure async image loading done before render
  const run = async () => {
    const enriched = await applyImagesToDataMap(dataMap || {});
    doc.setData(enriched);
    try {
      doc.render();
    } catch (e) {
      const reason = (e && e.properties && e.properties.errors && e.properties.errors.map((er) => er.properties && er.properties.explanation).join("\n")) || e.message || String(e);
      throw new Error(`DOCX render failed: ${reason}`);
    }
    return doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  };

  // Because we did async image preparation, return a Promise<Blob> instead of Blob
  // Callers can await this function when using images.
  return run();
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
