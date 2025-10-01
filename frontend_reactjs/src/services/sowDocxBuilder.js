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
  ImageRun,
  Footer,
  Header,
  BorderStyle,
  VerticalAlign,
} from "docx";

/**
 * Convert a data URL (image/*) to Uint8Array bytes.
 */
function dataUrlToBytes(dataUrl) {
  const [head, b64] = String(dataUrl || "").split(",");
  const bin = b64 ? atob(b64) : "";
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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

function formatValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  if (typeof v === "object") {
    try {
      return Object.keys(v)
        .map((k) => `${k}: ${formatValue(v[k])}`)
        .join("; ");
    } catch {
      return JSON.stringify(v);
    }
  }
  return cleanValue(String(v));
}

/**
 * Dotted path get
 */
function get(obj, path, fallback = "") {
  if (!obj || !path) return fallback;
  let cur = obj;
  for (const p of String(path).split(".")) {
    if (cur == null) return fallback;
    cur = cur[p];
  }
  return cur == null ? fallback : cur;
}

/**
 * Common styles and helpers for neat layout, wrapping, and safe construction.
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

// Create a normal paragraph with wrapping and comfortable spacing
function para(text, { bold = false, size = 21, align = AlignmentType.LEFT, after = 80 } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { after },
    children: [new TextRun({ text: cleanValue(text || ""), bold, size })],
  });
}

// Convert arbitrarily long text to multiple paragraphs split by newlines safely
function toParagraphs(text, { size = 21, align = AlignmentType.RIGHT } = {}) {
  const s = text == null ? "" : String(text);
  if (!s) return [new Paragraph({ alignment: align, children: [new TextRun({ text: "", size })] })];
  const lines = s.split(/\r?\n/);
  if (!Array.isArray(lines)) return [new Paragraph({ alignment: align, children: [new TextRun({ text: s, size })] })];
  if (lines.length === 0) return [new Paragraph({ alignment: align, children: [new TextRun({ text: "", size })] })];
  return lines.map((ln) => new Paragraph({ alignment: align, spacing: { after: 40 }, children: [new TextRun({ text: ln, size })] }));
}

// Full width table with borders; do not predefine row counts; let rows be passed directly
function tableFullWidth(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER,
    rows: safeRows,
  });
}

// Table cell with padding and wrapping content
function makeCell(children, { widthPct, vAlign = VerticalAlign.TOP, padding = 200 } = {}) {
  const safeChildren = Array.isArray(children) ? children : [children];
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: vAlign,
    margins: { top: padding, bottom: padding, left: padding, right: padding },
    children: safeChildren,
  });
}

function labelCell(text, widthPct) {
  return makeCell(para(text, { bold: true, align: AlignmentType.LEFT }), { widthPct, vAlign: VerticalAlign.CENTER });
}
function valueCell(text, widthPct) {
  return makeCell(toParagraphs(text, { align: AlignmentType.RIGHT }), { widthPct, vAlign: VerticalAlign.TOP });
}

/**
 * Date and currency helpers
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return cleanValue(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" });
  const yyyy = d.getFullYear();
  return `${dd} ${mon} ${yyyy}`;
}

function formatCurrency(val, currency = "USD") {
  if (val == null || val === "") return "";
  const num = typeof val === "number" ? val : Number(String(val).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return cleanValue(val);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(num);
  } catch {
    return num.toFixed(2);
  }
}

/**
 * Build top title + subtitle + intro paragraph
 */
function buildTopIntro({ meta = {}, templateData = {} }) {
  const companyName = cleanValue(
    get(templateData, "company_name") || get(meta, "client") || get(templateData, "client_name") || ""
  );
  const supplierName = cleanValue(
    get(templateData, "supplier_name") || get(meta, "supplier") || get(templateData, "vendor_name") || ""
  );

  const nodes = [];

  // Titles
  nodes.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "Statement of Work", bold: true, size: 26 })],
      heading: HeadingLevel.HEADING_1,
    })
  );
  nodes.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }, // 12 pt
      children: [new TextRun({ text: "Master Services Agreement", size: 22 })],
    })
  );

  // Intro paragraph
  const intro =
    `The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between ${companyName}, and ${supplierName} (the “Supplier”), as amended from time to time (the “Agreement”). ` +
    `Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. ` +
    `This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.`;

  nodes.push(para(intro, { size: 21, after: 240 }));

  return nodes;
}

/**
 * Build a unified two-column table for all fields in the same order they appear on the form.
 * Left column: field label/question (left aligned)
 * Right column: user-entered answer/value (right aligned)
 */
function buildAllFieldsTable({ templateData = {}, templateSchema }) {
  const rows = [];

  // Table header
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [para("SOW Details", { bold: true, size: 22, after: 40 })],
          columnSpan: 2,
        }),
      ],
    })
  );

  const L = 40;
  const V = 60;

  // Helper to push a standard row
  const pushRow = (label, value) => {
    rows.push(
      new TableRow({
        children: [labelCell(label || "", L), valueCell(value ?? "", V)],
      })
    );
  };

  // Flatten fields in order (support both sectioned and flat schemas)
  const orderedFields = [];
  if (templateSchema?.sections?.length) {
    for (const sec of templateSchema.sections) {
      for (const f of sec.fields || []) {
        orderedFields.push({ section: sec.section, ...f });
      }
    }
  } else if (templateSchema?.fields?.length) {
    for (const f of templateSchema.fields) {
      orderedFields.push(f);
    }
  }

  const seenKeys = new Set();

  const getDisplayForField = (field) => {
    const key = field.key;
    const raw = templateData?.[key];

    switch (field.type) {
      case "date":
        return formatDate(raw);
      case "currency":
        return formatCurrency(raw);
      case "list":
        if (Array.isArray(raw)) return raw.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join("\n");
        return cleanValue(raw);
      case "object":
        if (!raw || typeof raw !== "object") return "";
        // Render object sub-properties as multi-line "Label: value"
        const parts = [];
        for (const p of field.properties || []) {
          const v = raw[p.key];
          const lineVal =
            p.type === "date" ? formatDate(v) :
            p.type === "currency" ? formatCurrency(v) :
            Array.isArray(v) ? v.join(", ") :
            v ?? "";
          parts.push(`${p.label || p.key}: ${cleanValue(String(lineVal))}`);
        }
        return parts.join("\n");
      case "table":
        // Render table rows as multi-line JSON-ish for readability
        if (Array.isArray(raw) && raw.length) {
          const colLabels = (field.columns || []).map((c) => c.label || c.key);
          const lines = raw.map((row) => {
            return (field.columns || [])
              .map((c, idx) => `${colLabels[idx]}: ${cleanValue(String(row[c.key] ?? ""))}`)
              .join(" | ");
          });
          return lines.join("\n");
        }
        return "";
      case "signature":
        // Display placeholder text; images are already handled in Authorization
        return raw ? "[Signature Attached]" : "";
      default:
        return cleanValue(raw);
    }
  };

  // Walk ordered fields and add rows
  for (const f of orderedFields) {
    if (!f || !f.key || seenKeys.has(f.key)) continue;
    seenKeys.add(f.key);

    // Include every field regardless of emptiness to ensure nothing is skipped
    const label = f.label || f.key;
    const value = getDisplayForField(f);
    pushRow(label, value);
  }

  // Special financial fields: ensure we do not miss "Total Cost", "Pricing/Rate" by name variants
  const totalCostKeys = ["total_cost", "project_total", "budget_total", "total", "overall_cost"];
  const pricingRateKeys = ["pricing_rate", "rate", "rate_card", "contractor_rate", "contractor_rate_per_hr"];

  // If schema already had them as fields we already included.
  // But if they exist in templateData outside schema, append them to ensure no special field is missed.
  const tryAppendIfPresent = (label, keys, formatter) => {
    for (const k of keys) {
      if (seenKeys.has(k)) continue;
      const raw = get(templateData, k);
      if (raw != null && raw !== "") {
        const formatted = formatter ? formatter(raw) : cleanValue(raw);
        pushRow(label, formatted);
        seenKeys.add(k);
        break;
      }
    }
  };

  tryAppendIfPresent("Total Cost", totalCostKeys, (v) => formatCurrency(v, templateData?.currency || "USD"));
  tryAppendIfPresent("Pricing/Rate", pricingRateKeys, (v) => cleanValue(v));

  return tableFullWidth(rows);
}

/**
 * Build page header with logo in top-left
 */
function buildHeader({ meta = {}, templateData = {} }) {
  const logo = get(meta, "logoUrl") || get(templateData, "logo") || "";
  const headerChildren = [];
  if (logo && /^data:image\//.test(logo)) {
    try {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 80 },
          children: [
            new ImageRun({
              data: dataUrlToBytes(logo),
              transformation: { width: 120, height: 48 }, // ~1.25" x 0.5"
            }),
          ],
        })
      );
    } catch {
      // ignore bad logo
    }
  }
  return new Header({ children: headerChildren });
}

/**
 * PUBLIC_INTERFACE
 * Build the final SOW DOCX blob
 */
// PUBLIC_INTERFACE
export async function buildSowDocx(data, templateSchema) {
  const meta = data?.meta || {};
  const templateData = data?.templateData || {};
  const children = [];

  // Top titles and intro paragraph
  children.push(...buildTopIntro({ meta, templateData }));

  // Unified two-column table covering every field in order
  children.push(buildAllFieldsTable({ templateData, templateSchema }));

  // Authorization section: keep after the field table
  const footer = new Footer({ children: [] });
  const header = buildHeader({ meta, templateData });

  // Add Authorization preface and (if signatures exist) a small note row in the table is already present for signature fields.
  // We add a dedicated signature block for clarity, showing any uploaded signature images and signer details if present.
  const authNote = para("Authorization", { bold: true, size: 22, after: 120 });
  children.push(authNote);

  // Build a compact two-column signature block if any signature-related fields exist
  const supplierSig = templateData?.supplier_signature || templateData?.authorization_signatures?.supplier_signature;
  const clientSig = templateData?.client_signature || templateData?.authorization_signatures?.client_signature;
  if (supplierSig || clientSig) {
    const sigHeightPx = 77;
    const supplierChildren = [
      para("Supplier", { bold: true }),
      supplierSig && /^data:image\//.test(supplierSig)
        ? new Paragraph({
            children: [new ImageRun({ data: dataUrlToBytes(supplierSig), transformation: { width: 220, height: sigHeightPx } })],
          })
        : para(""),
    ];
    const clientChildren = [
      para("Client", { bold: true }),
      clientSig && /^data:image\//.test(clientSig)
        ? new Paragraph({
            children: [new ImageRun({ data: dataUrlToBytes(clientSig), transformation: { width: 220, height: sigHeightPx } })],
          })
        : para(""),
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER,
        rows: [
          new TableRow({
            children: [makeCell(supplierChildren, { widthPct: 50 }), makeCell(clientChildren, { widthPct: 50 })],
          }),
        ],
      })
    );
  }

  // Page setup: A4 portrait, margins top 1", bottom 0.75", left/right 0.75"
  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        footers: { default: footer },
        properties: {
          page: {
            margin: { top: 1440, right: 1080, bottom: 1080, left: 1080 },
            size: { width: 11907, height: 16839 },
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
  const title = (meta.title || meta.project || "Statement_of_Work").replace(/[^\w-]+/g, "_");
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(
    2,
    "0"
  )}`;
  return `SOW_${client}_${title}_${yyyymmdd}.docx`;
}
