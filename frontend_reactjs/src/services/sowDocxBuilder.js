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
function toParagraphs(text, { size = 21 } = {}) {
  const s = text == null ? "" : String(text);
  if (!s) return [para("", { size })];
  const lines = s.split(/\r?\n/);
  if (!Array.isArray(lines)) return [para(s, { size })];
  if (lines.length === 0) return [para("", { size })];
  return lines.map((ln) => para(ln, { size, after: 40 }));
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
  return makeCell(para(text, { bold: true }), { widthPct, vAlign: VerticalAlign.CENTER });
}
function valueCell(text, widthPct) {
  return makeCell(toParagraphs(text), { widthPct, vAlign: VerticalAlign.TOP });
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
 * Build Work Order Parameters table (header + rows 1..7)
 */
function buildParametersTable({ templateData = {} }) {
  const rows = [];

  // Header spanning two columns
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [para("Work Order Parameters", { bold: true, size: 22, after: 40 })],
          columnSpan: 2,
        }),
      ],
    })
  );

  const L = 38; // label width %
  const V = 62; // value width %

  const safePush = (row) => rows.push(row);

  safePush(
    new TableRow({
      children: [labelCell("1. Client Portfolio", L), valueCell(get(templateData, "client_portfolio"), V)],
    })
  );
  safePush(
    new TableRow({
      children: [labelCell("2. Type of Project", L), valueCell(get(templateData, "project_type"), V)],
    })
  );
  safePush(
    new TableRow({
      children: [
        labelCell("3. Engagement Number (Required for Fixed Price)", L),
        valueCell(get(templateData, "engagement_number"), V),
      ],
    })
  );
  safePush(
    new TableRow({
      children: [labelCell("4. Project Start Date", L), valueCell(formatDate(get(templateData, "start_date")), V)],
    })
  );
  safePush(
    new TableRow({
      children: [labelCell("5. Project End Date", L), valueCell(formatDate(get(templateData, "end_date")), V)],
    })
  );
  safePush(
    new TableRow({
      children: [labelCell("6. Planning Assumptions", L), valueCell(get(templateData, "planning_assumptions"), V)],
    })
  );
  safePush(
    new TableRow({
      children: [labelCell("7. Scope of Work (Required for Fixed Price)", L), valueCell(get(templateData, "scope_of_work"), V)],
    })
  );

  return tableFullWidth(rows);
}

/**
 * Two-column tables: Supplier Deliverables, Client Deliverables
 */
function buildTwoColDescriptionTable(titleLeft, bindLeftText, rightHeader = "", rightValue = "") {
  const rows = [];

  // Header row
  rows.push(
    new TableRow({
      children: [
        makeCell(para("Description", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
        makeCell(para(rightHeader || "", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );

  const leftParas = Array.isArray(bindLeftText)
    ? bindLeftText
    : typeof bindLeftText === "string"
    ? bindLeftText.split("\n").filter(Boolean)
    : [];

  rows.push(
    new TableRow({
      children: [
        makeCell(
          leftParas.length ? leftParas.map((p) => para(p)) : [para(bindLeftText || "")],
          { widthPct: 50 }
        ),
        makeCell([para(rightValue || "")], { widthPct: 50 }),
      ],
    })
  );

  return tableFullWidth(rows);
}

/**
 * Milestones/Financials table (left Description; right stacked Total Cost and Pricing/Rate)
 */
function buildMilestonesFinancials({ templateData = {}, currency = "USD" }) {
  const leftDesc = get(templateData, "milestones_description") || get(templateData, "milestones") || "";
  const totalCost = formatCurrency(get(templateData, "total_cost"), get(templateData, "currency") || currency);
  const pricingRate = cleanValue(get(templateData, "pricing_rate"));

  const rows = [];
  rows.push(
    new TableRow({
      children: [
        makeCell(para("Description", { bold: true }), { widthPct: 50 }),
        makeCell(para(""), { widthPct: 50 }),
      ],
    })
  );

  rows.push(
    new TableRow({
      children: [
        makeCell(toParagraphs(leftDesc), { widthPct: 50 }),
        makeCell(
          [
            para("Total Cost", { bold: true }),
            para(totalCost),
            para("Pricing/Rate", { bold: true }),
            para(pricingRate),
          ],
          { widthPct: 50 }
        ),
      ],
    })
  );

  return tableFullWidth(rows);
}

/**
 * Continuation parameters (items 11..20)
 */
function buildContinuationTable({ templateData = {} }) {
  const L = 38;
  const V = 62;

  const defaults = {
    slas: "N/A",
    communication_paths: "As defined in the Agreement.",
  };

  const rows = [];
  const pushRow = (label, value) =>
    rows.push(new TableRow({ children: [labelCell(label, L), valueCell(value ?? "", V)] }));

  pushRow("11. Client Relationship", get(templateData, "client_relationship"));
  pushRow("12. Negative Relationship Changes", get(templateData, "negative_relationship_changes"));
  pushRow("13. Change & Payment Structure (Fixed Price Only)", get(templateData, "change_payment_structure"));
  pushRow("14. Deliverable Rate / T&M", get(templateData, "rate_or_tnm"));
  pushRow("15. Key Client Personnel and Reportees", get(templateData, "key_client_personnel"));
  pushRow("16. Service Level Agreements", get(templateData, "slas") || defaults.slas);
  pushRow("17. Communication Paths", get(templateData, "communication_paths") || defaults.communication_paths);
  pushRow("18. Service Locations", get(templateData, "service_locations"));
  pushRow("19. Escalation Contact", get(templateData, "escalation_contact"));

  // 20. Points of Contact for Communications – render name/contact/email/address per line
  const poc = get(templateData, "poc_for_communications") || [];
  const lines = Array.isArray(poc)
    ? poc.map((p) => {
        const n = p?.name || p?.employee || "";
        const c = p?.contact || "";
        const e = p?.email || "";
        const a = p?.address || "";
        return [n, c, e, a].filter(Boolean).join(", ");
      })
    : typeof poc === "string"
    ? poc.split("\n")
    : [];
  rows.push(
    new TableRow({
      children: [
        labelCell("20. Points of Contact for Communications", L),
        makeCell(
          lines.length > 0 ? lines.map((ln) => para(ln)) : [para(poc || "")],
          { widthPct: V }
        ),
      ],
    })
  );

  return tableFullWidth(rows);
}

/**
 * Authorization section: preface paragraph and two-column signature table
 */
function buildAuthorization({ meta = {}, templateData = {} }) {
  const companyName = cleanValue(
    get(templateData, "company_name") || get(meta, "client") || get(templateData, "client_name") || "Company"
  );

  const preface = para(
    "An authorized representative of each party has executed this Work Order as of the date indicated under that representative’s signature.",
    { size: 21, after: 200 }
  );

  // Signature images
  const supplierSig =
    get(templateData, "authorization_signatures.supplier_signature") ||
    get(templateData, "supplier_signature") ||
    "";
  const companySig =
    get(templateData, "authorization_signatures.company_signature") ||
    get(templateData, "company_signature") ||
    "";

  const sigHeightPx = 77; // ~0.8"
  const leftColChildren = [
    new Paragraph({ children: [new TextRun({ text: "Supplier", bold: true, size: 21 })], alignment: AlignmentType.CENTER }),
    para("Signature", { bold: true }),
    supplierSig && /^data:image\//.test(supplierSig)
      ? new Paragraph({
          children: [new ImageRun({ data: dataUrlToBytes(supplierSig), transformation: { width: 220, height: sigHeightPx } })],
        })
      : para(""),
    para("Name", { bold: true }),
    para(cleanValue(get(templateData, "supplier_signer_name") || "")),
    para("Title", { bold: true }),
    para(cleanValue(get(templateData, "supplier_signer_title") || "")),
    para("Date", { bold: true }),
    para(cleanValue(get(templateData, "supplier_sign_date") || "")),
  ];

  const rightColChildren = [
    new Paragraph({ children: [new TextRun({ text: companyName, bold: true, size: 21 })], alignment: AlignmentType.CENTER }),
    para("Signature", { bold: true }),
    companySig && /^data:image\//.test(companySig)
      ? new Paragraph({
          children: [new ImageRun({ data: dataUrlToBytes(companySig), transformation: { width: 220, height: sigHeightPx } })],
        })
      : para(""),
    para("Name", { bold: true }),
    para(cleanValue(get(templateData, "company_signer_name") || "")),
    para("Title", { bold: true }),
    para(cleanValue(get(templateData, "company_signer_title") || "")),
    para("Date", { bold: true }),
    para(cleanValue(get(templateData, "company_sign_date") || "")),
  ];

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER,
    rows: [
      new TableRow({
        children: [
          makeCell(leftColChildren, { widthPct: 50 }),
          makeCell(rightColChildren, { widthPct: 50 }),
        ],
      }),
    ],
  });

  return { preface, table };
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

  // Work Order Parameters table
  children.push(buildParametersTable({ templateData }));

  // Supplier Deliverables
  const supplierDeliverables = get(templateData, "supplier_deliverables") || "";
  children.push(buildTwoColDescriptionTable("Supplier Deliverables", supplierDeliverables));

  // Client Deliverables
  const clientDeliverables = get(templateData, "client_deliverables") || "";
  children.push(buildTwoColDescriptionTable("Client Deliverables", clientDeliverables));

  // Milestones / Financials
  children.push(buildMilestonesFinancials({ templateData }));

  // Continuation table (11..20)
  children.push(buildContinuationTable({ templateData }));

  // Authorization preface + table
  const { preface, table } = buildAuthorization({ meta, templateData });
  children.push(preface);
  children.push(table);

  // Footer: keep minimal to allow page content to flow; page numbers intentionally omitted
  const footer = new Footer({ children: [] });

  const header = buildHeader({ meta, templateData });

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
        // Important: children only; tables will naturally split across pages in docx library
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
