import {
  Document,
  Packer,
  Paragraph,
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
  ShadingType,
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
 * Determine if a section name corresponds to the 'Work Order Parameters' (case-insensitive).
 */
function isWorkOrderParametersSectionName(name) {
  const secName = String(name || "").trim().toLowerCase();
  return secName === "work order parameters";
}

/**
 * From schema, build an ordered, deduplicated list of fields for the Actions table.
 * - Prefer schema order.
 * - Use provided labels when present; otherwise generate professional label.
 * - Do not expand arrays into indexed keys; keep as a single field.
 * - For object fields, include their properties as individual rows following parent order.
 * - Entirely omit any fields that are part of 'Work Order Parameters' section.
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
    if (!f) return;
    const key = parentKey ? `${parentKey}.${f.key}` : f.key;

    if (f.type === "object" && Array.isArray(f.properties)) {
      // Include object properties as separate rows; do not push parent row
      for (const p of f.properties) {
        addField(p, key);
      }
    } else {
      push(f.label || toProfessionalLabel(f.key), key, f.type || "text");
    }
  };

  // Respect section order; skip Work Order Parameters section entirely
  if (Array.isArray(templateSchema.sections)) {
    for (const sec of templateSchema.sections) {
      if (isWorkOrderParametersSectionName(sec?.name)) continue;
      for (const f of sec.fields || []) addField(f, "");
    }
  } else if (Array.isArray(templateSchema.fields)) {
    // No explicit section context; include all fields (cannot identify WOP here)
    for (const f of templateSchema.fields) addField(f, "");
  } else {
    // Fallback from data
    Object.keys(templateData || {}).forEach((k) => push(toProfessionalLabel(k), k, "text"));
  }

  // Condense known array fields into single-entry rows (already by push), ensure no dotted indices entered.
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
 * Common styles for layout per design notes
 * - Use a light-gray rounded rectangle container for the Actions rows.
 */
const BORDER_LIGHT = "E5E7EB"; // Tailwind gray-200
const CONTAINER_SHADE = "F3F4F6"; // gray-100
const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_LIGHT },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_LIGHT },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_LIGHT },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_LIGHT },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER_LIGHT },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER_LIGHT },
};

function para(
  text,
  { bold = false, size = 22, align = AlignmentType.LEFT, after = 160 } = {}
) {
  // size ~ 11pt (22 half-points). after ~ 12-16px (approx 160 twips)
  return new Paragraph({
    alignment: align,
    spacing: { after },
    children: [new TextRun({ text: cleanValue(text || ""), bold, size })],
  });
}

function toParagraphs(text, { size = 22, align = AlignmentType.LEFT, after = 0 } = {}) {
  const s = text == null ? "" : String(text);
  if (!s)
    return [
      new Paragraph({ alignment: align, spacing: { after }, children: [new TextRun({ text: "", size })] }),
    ];
  const lines = s.split(/\r?\n/);
  if (!Array.isArray(lines))
    return [new Paragraph({ alignment: align, spacing: { after }, children: [new TextRun({ text: s, size })] })];
  if (lines.length === 0)
    return [
      new Paragraph({ alignment: align, spacing: { after }, children: [new TextRun({ text: "", size })] }),
    ];
  return lines.map(
    (ln) =>
      new Paragraph({
        alignment: align,
        spacing: { after },
        children: [new TextRun({ text: ln, size })],
      })
  );
}

function tableFullWidth(rows, { shaded = false } = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER,
    shading: shaded
      ? { type: ShadingType.CLEAR, fill: CONTAINER_SHADE, color: "auto" }
      : undefined,
    rows: safeRows,
  });
}

/**
 * Generic table cell helper used by Actions table with rounded-like visual via background and border.
 */
function makeCell(
  children,
  { widthPct, vAlign = VerticalAlign.TOP, padding = 200, opts = {}, shaded = false } = {}
) {
  const safeChildren = Array.isArray(children) ? children : [children];
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: vAlign,
    margins: { top: padding, bottom: padding, left: padding, right: padding },
    shading: shaded ? { type: ShadingType.CLEAR, fill: CONTAINER_SHADE, color: "auto" } : undefined,
    children: safeChildren,
    ...opts,
  });
}

/**
 * Build the styled Actions block per design:
 * - Bold 'Actions' header with ~12–16px spacing below
 * - Light-gray rounded rectangle container with one row per field
 * - Left label (professional), right value
 */
function buildActionsTable({ templateSchema, templateData }) {
  const L = 40;
  const V = 60;
  const rows = [];

  // Header (bold, sentence case, spacing ~12-16px)
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 160 },
              children: [new TextRun({ text: "Actions", bold: true, size: 24 })],
            }),
          ],
          // No shading on header cell (white), keep container feel clean
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
          makeCell(
            toParagraphs(f.label, { align: AlignmentType.LEFT }),
            {
              widthPct: L,
              vAlign: VerticalAlign.CENTER,
              shaded: true,
            }
          ),
          makeCell(
            toParagraphs(display, { align: AlignmentType.LEFT }),
            {
              widthPct: V,
              vAlign: VerticalAlign.TOP,
              shaded: true,
            }
          ),
        ],
      })
    );
  }

  // Entire block inside light-gray rounded rectangle feel using shading + light borders
  return tableFullWidth(rows, { shaded: true });
}

/**
 * Minimal header/footer (preserved)
 */
function buildHeader() {
  return new Header({ children: [] });
}
function buildFooter() {
  return new Footer({ children: [] });
}

/**
 * PUBLIC_INTERFACE
 * Build the final DOCX blob containing the styled Actions section while omitting the 'Work Order Parameters'.
 */
// PUBLIC_INTERFACE
export async function buildSowDocx(data, templateSchema) {
  const templateData = data?.templateData || {};
  const children = [];

  // Build only the Actions section here per current flow
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
