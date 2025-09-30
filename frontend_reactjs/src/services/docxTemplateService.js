//
//
// PUBLIC_INTERFACE
// DOCX Template Service: parses provided DOCX-transcript .txt files for placeholders,
// and provides preview rendering helpers. Overlay-based DOCX generation and any
// auto-insertion of default fields have been removed to comply with strict template export.
//

/**
 * PUBLIC_INTERFACE
 * parseDocxTranscriptPlaceholders
 * Parse a plain text transcript of a DOCX file to extract user-editable placeholders.
 * It identifies tokens in square brackets like [Field Name], and angle tokens like <Supplier>
 * as potential placeholders. Returns a unique, normalized list with inferred field types.
 *
 * @param {string} transcriptText - The text content derived from a .docx (provided as .txt).
 * @param {object} [options] - Parsing options
 * @returns {{fields: Array<{key:string,label:string,type:string,source:string}>}}
 */
export function parseDocxTranscriptPlaceholders(transcriptText, options = {}) {
  const text = String(transcriptText || "");
  const set = new Map();

  // Match [Placeholders]
  const bracketMatches = Array.from(text.matchAll(/\[([^\]\n]+)\]/g)).map((m) => m[1].trim());
  // Match <Placeholders>
  const angleMatches = Array.from(text.matchAll(/<([^>\n]+)>/g)).map((m) => m[1].trim());

  const all = [...bracketMatches, ...angleMatches]
    .map((label) => label.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const label of all) {
    const key = normalizeKey(label);
    if (!set.has(key)) {
      set.set(key, {
        key,
        label,
        type: inferTypeFromLabel(label),
        source: "auto",
      });
    }
  }

  // Do not auto-insert any additional fields. Only return placeholders actually found in transcript.
  return { fields: Array.from(set.values()) };
}

function normalizeKey(label) {
  // Convert to a safe snake-like key
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inferTypeFromLabel(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("date")) return "date";
  if (l.includes("email")) return "email";
  if (l.includes("rate") || l.includes("budget") || l.includes("cost")) return "currency";
  if (l.includes("description") || l.includes("scope")) return "textarea";
  return "text";
}

/**
 * PUBLIC_INTERFACE
 * buildDynamicTemplateSchemaFromTranscript
 * Generate a runtime schema from a transcript for dynamic form rendering.
 * This is a UI helper only and does not affect export behavior.
 *
 * @param {string} transcriptText
 * @param {string} templateId
 * @param {string} title
 * @returns {{id:string,title:string,fields:Array}}
 */
export function buildDynamicTemplateSchemaFromTranscript(transcriptText, templateId, title) {
  const { fields } = parseDocxTranscriptPlaceholders(transcriptText);

  // Preserve just the discovered fields
  const outFields = fields.map((f) => ({ key: f.key, label: f.label, type: f.type }));

  return {
    id: templateId,
    title: title || templateId,
    fields: outFields,
  };
}

/**
 * PUBLIC_INTERFACE
 * makeTranscriptPreviewHtml
 * Convert transcript text into simple HTML for read-only preview inside a faux page container.
 * This preserves original text but escapes HTML and formats headings heuristically.
 *
 * @param {string} transcriptText
 * @returns {string} HTML string
 */
export function makeTranscriptPreviewHtml(transcriptText) {
  const text = String(transcriptText || "");
  const lines = text.split(/\r?\n/);
  return lines
    .map((l) => {
      if (/^\s*(Statement of Work|Scope of Work|Authorization|Project|Work Order|Master Services Agreement)/i.test(l)) {
        return `<h3 style="margin: 12px 0 6px 0; font-weight: 800;">${escapeHtml(l)}</h3>`;
      }
      return `<p style="margin: 6px 0">${escapeHtml(l)}</p>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * PUBLIC_INTERFACE
 * zipSync
 * Minimal ZIP writer to package arbitrary text/binary files into a blob.
 * Retained for UI utilities, but NOT used to add content to DOCX exports.
 * @param {Object.<string, string|Uint8Array>} fileMap
 * @returns {Blob}
 */
export function zipSync(fileMap) {
  const textEncoder = new TextEncoder();
  const fileEntries = [];
  const centralEntries = [];
  let offset = 0;

  const DOS_TIME = 0;
  const DOS_DATE = 0;

  Object.keys(fileMap).forEach((filename) => {
    const val = fileMap[filename];
    const content = typeof val === "string" ? textEncoder.encode(val) : val;
    const nameBytes = textEncoder.encode(filename);
    const crc = crc32(content);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, DOS_TIME);
    writeUint16(localHeader, 12, DOS_DATE);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, content.length);
    writeUint32(localHeader, 22, content.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    fileEntries.push(localHeader, content);

    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 8, 0);
    writeUint16(central, 10, 0);
    writeUint16(central, 12, DOS_TIME);
    writeUint16(central, 14, DOS_DATE);
    writeUint32(central, 16, crc);
    writeUint32(central, 20, content.length);
    writeUint32(central, 24, content.length);
    writeUint16(central, 28, nameBytes.length);
    writeUint16(central, 30, 0);
    writeUint16(central, 32, 0);
    writeUint16(central, 34, 0);
    writeUint16(central, 36, 0);
    writeUint32(central, 38, 0);
    writeUint32(central, 42, offset);
    central.set(nameBytes, 46);

    centralEntries.push({ central, size: central.length });
    offset += localHeader.length + content.length;
  });

  const centralSize = centralEntries.reduce((s, e) => s + e.size, 0);
  const centralOffset = offset;

  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 4, 0);
  writeUint16(end, 6, 0);
  writeUint16(end, 8, Object.keys(fileMap).length);
  writeUint16(end, 10, Object.keys(fileMap).length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, centralOffset);
  writeUint16(end, 20, 0);

  const totalSize = offset + centralSize + end.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  fileEntries.forEach((u8) => {
    out.set(u8, pos);
    pos += u8.length;
  });
  centralEntries.forEach(({ central }) => {
    out.set(central, pos);
    pos += central.length;
  });
  out.set(end, pos);

  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function writeUint16(arr, pos, val) {
  arr[pos] = val & 0xff;
  arr[pos + 1] = (val >>> 8) & 0xff;
}
function writeUint32(arr, pos, val) {
  arr[pos] = val & 0xff;
  arr[pos + 1] = (val >>> 8) & 0xff;
  arr[pos + 2] = (val >>> 16) & 0xff;
  arr[pos + 3] = (val >>> 24) & 0xff;
}

function crc32(bytes) {
  let c = -1;
  for (let i = 0; i < bytes.length; i++) {
    c = (c >>> 8) ^ table[(c ^ bytes[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}
const table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

/**
 * PUBLIC_INTERFACE
 * parseTranscriptToSectionedSchema
 * Bridge to new sowTemplateParser for sectioned parsing + schema assembly.
 * This keeps docxTemplateService as the central facade for transcript operations.
 */
export async function parseTranscriptToSectionedSchema(transcriptText, templateId, title) {
  const mod = await import('./sowTemplateParser.js');
  const parsed = mod.parseSOWTranscriptToSections(transcriptText);
  const schema = mod.buildDynamicSchemaFromSections(parsed, templateId, title);
  return { parsed, schema };
}
