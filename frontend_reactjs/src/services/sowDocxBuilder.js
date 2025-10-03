import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Footer,
  Header,
  BorderStyle,
  VerticalAlign,
} from "docx";

/**
 * Normalize a label into a stable key-ish id.
 */
function normalizeLabel(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Clean display value: remove placeholder underscores and trim artifacts.
 */
function cleanValue(v) {
  if (v == null) return "";
  const s = String(v);
  if (/^_+$/.test(s)) return "";
  return s.replace(/_{2,}/g, " ").trim();
}

/**
 * Turn a schema key into a professional label if label is not provided.
 * Examples: client_portfolio -> "Client Portfolio", included_projects -> "Included Projects"
 */
function toProfessionalLabel(keyOrLabel) {
  if (!keyOrLabel) return "";
  // If it already contains spaces and some uppercase, assume it's a provided label
  const hasSpace = /\s/.test(keyOrLabel);
  const hasUpper = /[A-Z]/.test(keyOrLabel);
  if (hasSpace && hasUpper) return keyOrLabel;

  // Convert snake_case or dot.notation to spaced Title Case
  const cleaned = String(keyOrLabel).replace(/[.\[\]\d]+/g, " ").replace(/_/g, " ").trim();
  return cleaned
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Format a field value for display. Arrays are displayed as comma-separated; objects flattened as key: value pairs.
 */
function formatValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) {
    const flat = v
      .filter((x) => x != null && String(x).trim() !== "")
      .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x).trim()));
    return flat.join(", ");
  }
  if (typeof v === "object") {
    try {
      const parts = Object.keys(v)
        .map((k) => `${toProfessionalLabel(k)}: ${formatValue(v[k])}`)
        .filter((s) => s.trim() !== "");
      return parts.join("; ");
    } catch {
      return JSON.stringify(v);
    }
  }
  return cleanValue(String(v));
}

/**
 * From schema, build an ordered, deduplicated list of fields for the Actions table.
 * - Prefer schema order.
 * - Use provided labels when present; otherwise generate professional label.
 * - Do not expand arrays into indexed keys; keep as a single field.
 * - For object fields, include their properties as individual rows following parent order.
 */
function buildOrderedActionFields(templateSchema = {}, templateData = {}) {
  const out = [];
  const seen = new Set();

  const push = (label, key, type = "text") => {
    const k = String(key || "").trim();
    if (!k) return;
    if (seen.has(k)) return;
    seen.add(k);
    const lbl = label && String(label).trim() ? label : toProfessionalLabel(k);
    out.push({ label: lbl, key: k, type });
  };

  const addField = (f, parentKey = "") => {
    const key = parentKey ? `${parentKey}.${f.key}` : f.key;
    if (!f) return;
    if (f.type === "object" && Array.isArray(f.properties)) {
      // do not push parent as its own row, only properties to avoid noisy labels
      for (const p of f.properties) {
        addField(p, key);
      }
    } else {
      push(f.label || toProfessionalLabel(f.key), key, f.type || "text");
    }
  };

  // Prefer sectioned schema order
  if (Array.isArray(templateSchema.sections)) {
    for (const sec of templateSchema.sections) {
      for (const f of sec.fields || []) {
        addField(f, "");
      }
    }
  } else if (Array.isArray(templateSchema.fields)) {
    for (const f of templateSchema.fields) {
      addField(f, "");
    }
  } else {
    // Fallback: infer from data top-level keys, keep only top-level without indexes
    Object.keys(templateData || {}).forEach((k) => push(toProfessionalLabel(k), k, "text"));
  }

  return out;
}

/**
 * Get value by dotted path.
 */
function getByPath(obj, path, fallback = "") {
  if (!obj || !path) return fallback;
  const tokens = String(path).split(".");
  let cur = obj;
  for (const t of tokens) {
    if (cur == null) return fallback;
    cur = cur[t];
  }
  return cur == null ? fallback : cur;
}

/**
 * Common styles for layout
 */
const BORDER_GRAY = "B5B5B5";
const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY },
  left: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY },
  right: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY },
  insideVertical: { style: BorderStyle.SINGLE, size: 8, color: BORDER_GRAY },
};

function para(
  text,
  { bold = false, size = 21, align = AlignmentType.LEFT, after = 80 } = {}
) {
  return new Paragraph({
    alignment: align,
    spacing: { after },
    children: [new TextRun({ text: cleanValue(text || ""), bold, size })],
  });
}

function toParagraphs(text, { size = 21, align = AlignmentType.LEFT } = {}) {
  const s = text == null ? "" : String(text);
  if (!s)
    return [
      new Paragraph({ alignment: align, children: [new TextRun({ text: "", size })] }),
    ];
  const lines = s.split(/\r?\n/);
  if (!Array.isArray(lines))
    return [new Paragraph({ alignment: align, children: [new TextRun({ text: s, size })] })];
  if (lines.length === 0)
    return [
      new Paragraph({ alignment: align, children: [new TextRun({ text: "", size })] }),
    ];
  return lines.map(
    (ln) =>
      new Paragraph({
        alignment: align,
        spacing: { after: 40 },
        children: [new TextRun({ text: ln, size })],
      })
  );
}

function tableFullWidth(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER,
    rows: safeRows,
  });
}

/**
 * Generic table cell helper used by Actions table.
 */
function makeCell(
  children,
  { widthPct, vAlign = VerticalAlign.TOP, padding = 200, opts = {} } = {}
) {
  const safeChildren = Array.isArray(children) ? children : [children];
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: vAlign,
    margins: { top: padding, bottom: padding, left: padding, right: padding },
    children: safeChildren,
    ...opts,
  });
}

/**
 * Convenience wrappers for label/value cells (kept minimal and neutral)
 */
function labelCell(text, widthPct) {
  return makeCell(para(text, { bold: true, align: AlignmentType.LEFT }), {
    widthPct,
    vAlign: VerticalAlign.CENTER,
  });
}
function valueCell(text, widthPct) {
  return makeCell(toParagraphs(text, { align: AlignmentType.LEFT }), {
    widthPct,
    vAlign: VerticalAlign.TOP,
  });
}

/**
 * Build an Actions table with professional labels and single, deduped rows.
 * Arrays are displayed as a single, comma-separated value.
 */
function buildActionsTable({ templateSchema, templateData }) {
  const L = 40;
  const V = 60;
  const rows = [];

  // Header
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [para("Actions", { bold: true, size: 22, after: 40 })],
          columnSpan: 2,
        }),
      ],
    })
  );

  const ordered = buildOrderedActionFields(templateSchema, templateData);

  for (const f of ordered) {
    const raw = getByPath(templateData, f.key, "");
    const display = formatValue(raw);
    rows.push(
      new TableRow({
        children: [
          makeCell(para(f.label, { bold: true, align: AlignmentType.LEFT }), {
            widthPct: L,
            vAlign: VerticalAlign.CENTER,
          }),
          makeCell(toParagraphs(display, { align: AlignmentType.LEFT }), {
            widthPct: V,
            vAlign: VerticalAlign.TOP,
          }),
        ],
      })
    );
  }

  return tableFullWidth(rows);
}

/**
 * Minimal header/footer (no logos or authorization/signatures)
 */
function buildHeader() {
  return new Header({ children: [] });
}
function buildFooter() {
  return new Footer({ children: [] });
}

/**
 * PUBLIC_INTERFACE
 * Build the final DOCX blob with ONLY the Actions table.
 */
// PUBLIC_INTERFACE
export async function buildSowDocx(data, templateSchema) {
  const templateData = data?.templateData || {};
  const children = [];

  // Only Actions table
  children.push(buildActionsTable({ templateSchema, templateData }));

  const footer = buildFooter();
  const header = buildHeader();

  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        footers: { default: footer },
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * PUBLIC_INTERFACE
 * Generate a filename
 */
// PUBLIC_INTERFACE
export function makeSowDocxFilename(data) {
  const meta = data?.meta || {};
  const client = (meta.client || "Client").replace(/[^\w-]+/g, "_");
  const title = (meta.title || meta.project || "Actions").replace(/[^\w-]+/g, "_");
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}`;
  return `SOW_${client}_${title}_${yyyymmdd}.docx`;
}
