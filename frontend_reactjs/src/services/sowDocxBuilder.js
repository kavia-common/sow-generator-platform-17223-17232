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
 * Development/runtime flag safe for browser.
 * Avoids process.* usage to prevent ReferenceError on client.
 */
const isDev =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.MODE === "development") ||
  (typeof window !== "undefined" && window.__DEV__ === true);

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

/**
 * Full width table with borders.
 * SAFETY: If rows is not an array or is empty, return null to allow callers to skip adding the table.
 * Also ensures we never construct docx.Table with invalid row/column dimensions.
 */
function tableFullWidth(rows) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (safeRows.length === 0) {
    // Aid debugging while keeping runtime stable
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn("tableFullWidth: no rows to render, skipping table.");
    }
    return null;
  }
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
 * Flatten and format values for schema-based table.
 * Arrays: bullet-like list (comma-joined); Objects: key: value; Tables: each row as JSON line.
 */
function formatForSchema(value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    // Array of scalars or objects
    if (value.length === 0) return "";
    const isObjArr = value.some((v) => v && typeof v === "object" && !Array.isArray(v));
    if (isObjArr) {
      return value
        .map((row) => {
          try {
            return Object.keys(row).map((k) => `${k}: ${formatValue(row[k])}`).join("; ");
          } catch {
            return JSON.stringify(row);
          }
        })
        .join("\n");
    }
    return value.map((v) => formatValue(v)).join(", ");
  }
  if (typeof value === "object") {
    try {
      return Object.keys(value)
        .map((k) => `${k}: ${formatValue(value[k])}`)
        .join("; ");
    } catch {
      return JSON.stringify(value);
    }
  }
  return String(value);
}

/**
 * PUBLIC_INTERFACE
 * enumerateFieldsFromSchema
 * Walk a sectioned or flat templateSchema and return ordered label/value pairs for all fields.
 * Includes fields even if empty to reflect schema presence; values shown as empty string when not provided.
 */
function enumerateFieldsFromSchema(templateSchema, templateData) {
  const rows = [];
  const data = templateData || {};
  const pushRow = (label, val) => {
    rows.push({ label: String(label || ""), value: formatForSchema(val) });
  };

  // If schema has sections
  if (Array.isArray(templateSchema.sections)) {
    (templateSchema.sections || []).forEach((sec) => {
      (sec.fields || []).forEach((f) => {
        if (f.type === "object" && Array.isArray(f.properties)) {
          const objVal = data[f.key];
          f.properties.forEach((p) => {
            const label = `${f.label || f.key} — ${p.label || p.key}`;
            const val = objVal ? objVal[p.key] : undefined;
            pushRow(label, val);
          });
        } else if (f.type === "table" && Array.isArray(f.columns)) {
          // tables are arrays of row objects under data[f.key]
          const tableRows = data[f.key] || [];
          const label = f.label || f.key;
          pushRow(label, tableRows);
        } else {
          const label = f.label || f.key;
          pushRow(label, data[f.key]);
        }
      });
    });
    return rows;
  }

  // Flat schema { fields: [] }
  if (Array.isArray(templateSchema.fields)) {
    (templateSchema.fields || []).forEach((f) => {
      if (f.type === "object" && Array.isArray(f.properties)) {
        const objVal = data[f.key];
        f.properties.forEach((p) => {
          const label = `${f.label || f.key} — ${p.label || p.key}`;
          const val = objVal ? objVal[p.key] : undefined;
          pushRow(label, val);
        });
      } else if (f.type === "table" && Array.isArray(f.columns)) {
        const tableRows = data[f.key] || [];
        const label = f.label || f.key;
        pushRow(label, tableRows);
      } else {
        pushRow(f.label || f.key, data[f.key]);
      }
    });
    return rows;
  }

  // Unknown schema shape; fallback to existing keys (order not guaranteed)
  Object.keys(data || {}).forEach((k) => pushRow(k, data[k]));
  return rows;
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
 * Intentionally removed Work Order Parameters table per requirement.
 * Any former parameters will be reflected only through their specific sections/tables.
 */

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

  const tbl = tableFullWidth(rows);
  return tbl;
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

  const tbl = tableFullWidth(rows);
  return tbl;
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

  const tbl = tableFullWidth(rows);
  return tbl;
}

/**
 * Authorization section: preface paragraph and two-column signature table
 */
function buildActionsMetadataTable({ templateData = {} }) {
  // Mapping rules and order from assets/actions_section_docx_mapping.md
  // Render ONLY these keys in this exact order. Skip empty values entirely.
  const ACTIONS_ORDER = [
    "address_block_address_supplier_name",
    "address_block_address_supplier_address",
    "address_block_address_postal",
    "supplier_signature",
    "supplier_signature_name",
    "supplier_signature_date",
    "other_company_name_signature_block",
    "other_company_name_signature_date",
  ];

  // Resolve by key using known schema/aliases, preserving user-entered formatting.
  function resolveValueByKey(k) {
    switch (k) {
      case "address_block_address_supplier_name":
        return (
          get(templateData, "address_block.address_supplier_name") ??
          get(templateData, "address_supplier_name") ??
          get(templateData, "address_for_communications.supplier_name")
        );
      case "address_block_address_supplier_address":
        // The mapping doc label suggests supplier address line (often contact name/address line in our schema)
        return (
          get(templateData, "address_block.address_contact_name") ??
          get(templateData, "address_contact_name") ??
          get(templateData, "address_for_communications.contact_name")
        );
      case "address_block_address_postal":
        return (
          get(templateData, "address_block.address_postal") ??
          get(templateData, "address_postal") ??
          get(templateData, "address_for_communications.address") ??
          get(templateData, "address_for_communications.email")
        );
      case "supplier_signature":
        // If an actual image is present, omit this row per mapping doc (image will appear in signature block)
        const sigImg =
          get(templateData, "authorization_signatures.supplier_signature") ??
          get(templateData, "supplier_signature");
        if (sigImg && /^data:image\//.test(sigImg)) return "";
        return sigImg;
      case "supplier_signature_name":
        return (
          get(templateData, "authorization_signatures.supplier_signature_name") ??
          get(templateData, "supplier_signature_name") ??
          get(templateData, "supplier_signer_name")
        );
      case "supplier_signature_date":
        // Preserve user-entered format; do not reformat here
        return (
          get(templateData, "authorization_signatures.supplier_signature_date") ??
          get(templateData, "supplier_signature_date") ??
          get(templateData, "supplier_sign_date")
        );
      case "other_company_name_signature_block":
        return (
          get(templateData, "client_company_name_signature_block") ??
          get(templateData, "company_name") ??
          get(templateData, "client_company_name") ??
          get(templateData, "client_name")
        );
      case "other_company_name_signature_date":
        return (
          get(templateData, "authorization_signatures.client_signature_date") ??
          get(templateData, "client_signature_date") ??
          get(templateData, "company_sign_date")
        );
      default:
        return get(templateData, k);
    }
  }

  // Build a tidy two-column Q/A table. No extra headings beyond what the mapping dictates.
  const L = 50;
  const V = 50;
  const rows = [];

  ACTIONS_ORDER.forEach((k) => {
    const raw = resolveValueByKey(k);
    const text = cleanValue(raw);
    if (text && text.trim().length > 0) {
      rows.push(
        new TableRow({
          children: [labelCell(k, L), valueCell(text, V)],
        })
      );
    }
  });

  if (rows.length === 0) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn("buildActionsMetadataTable: No action metadata rows to render, skipping table.");
    }
    return null;
  }

  const tbl = tableFullWidth(rows);
  return tbl;
}

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
    get(templateData, "authorization_signatures.client_signature") ||
    get(templateData, "client_signature") ||
    get(templateData, "company_signature") ||
    "";

  const sigHeightPx = 77; // ~0.8"
  const supplierName =
    get(templateData, "authorization_signatures.supplier_signature_name") ||
    get(templateData, "supplier_signature_name") ||
    get(templateData, "supplier_signer_name") ||
    "";
  const supplierTitle =
    get(templateData, "authorization_signatures.supplier_signature_title") ||
    get(templateData, "supplier_signature_title") ||
    get(templateData, "supplier_signer_title") ||
    "";
  const supplierDate =
    get(templateData, "authorization_signatures.supplier_signature_date") ||
    get(templateData, "supplier_signature_date") ||
    get(templateData, "supplier_sign_date") ||
    "";

  const leftColChildren = [
    new Paragraph({ children: [new TextRun({ text: "Supplier", bold: true, size: 21 })], alignment: AlignmentType.CENTER }),
    para("Signature", { bold: true }),
    supplierSig && /^data:image\//.test(supplierSig)
      ? new Paragraph({
          children: [new ImageRun({ data: dataUrlToBytes(supplierSig), transformation: { width: 220, height: sigHeightPx } })],
        })
      : para(""),
    // Ensure only the signature block shows these lines; do not repeat in Q/A table.
    para("Supplier:", { bold: false }),
    para(cleanValue(get(templateData, "supplier_name") || get(templateData, "supplier_company_name") || "")),
    para("Name:", { bold: false }),
    para(cleanValue(supplierName)),
    para("Title:", { bold: false }),
    para(cleanValue(supplierTitle)),
    para("Date:", { bold: false }),
    para(cleanValue(supplierDate)),
  ];

  const clientNameForBlock =
    get(templateData, "client_company_name_signature_block") ||
    get(templateData, "client_company_name") ||
    get(templateData, "client_name") ||
    companyName ||
    "";

  const companySignerName =
    get(templateData, "authorization_signatures.client_signature_name") ||
    get(templateData, "client_signature_name") ||
    get(templateData, "company_signer_name") ||
    "";
  const companySignerTitle =
    get(templateData, "authorization_signatures.client_signature_title") ||
    get(templateData, "client_signature_title") ||
    get(templateData, "company_signer_title") ||
    "";
  const companySignerDate =
    get(templateData, "authorization_signatures.client_signature_date") ||
    get(templateData, "client_signature_date") ||
    get(templateData, "company_sign_date") ||
    "";

  const rightColChildren = [
    new Paragraph({ children: [new TextRun({ text: companyName, bold: true, size: 21 })], alignment: AlignmentType.CENTER }),
    para("Signature", { bold: true }),
    companySig && /^data:image\//.test(companySig)
      ? new Paragraph({
          children: [new ImageRun({ data: dataUrlToBytes(companySig), transformation: { width: 220, height: sigHeightPx } })],
        })
      : para(""),
    // Signature block must contain the readable lines; keep labels even if value blank.
    para("Company:", { bold: false }),
    para(cleanValue(clientNameForBlock)),
    para("Name:", { bold: false }),
    para(cleanValue(companySignerName)),
    para("Title:", { bold: false }),
    para(cleanValue(companySignerTitle)),
    para("Date:", { bold: false }),
    para(cleanValue(companySignerDate)),
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
  const rawLogo = get(meta, "logoUrl") || get(templateData, "logo") || "";
  const headerChildren = [];

  const makeImagePara = (bytes) =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new ImageRun({
          data: bytes,
          transformation: { width: 120, height: 48 }, // ~1.25" x 0.5"
        }),
      ],
    });

  async function resolveLogoBytesSyncish(url) {
    // Synchronous path for data URLs
    if (url && typeof url === "string" && /^data:image\//.test(url)) {
      try { return dataUrlToBytes(url); } catch { return null; }
    }
    // We cannot do async fetch here inside header build (docx APIs expect sync).
    // So skip non-data URLs; upstream callers should ensure meta.logoUrl is a data URL when possible.
    return null;
  }

  const bytes = resolveLogoBytesSyncish(rawLogo);
  if (bytes) {
    try {
      headerChildren.push(makeImagePara(bytes));
    } catch {
      // ignore
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

  // Preamble paragraph with runtime values replacing placeholders
  // Uses Start Date, End Date, and Supplier (Supplier Name) only in this paragraph,
  // and ensures these are NOT included as fields in the "All Entered Fields" section below.
  {
    const supplierName =
      cleanValue(
        get(templateData, "supplier_name") ||
          get(templateData, "address_block.address_supplier_name") ||
          get(templateData, "address_supplier_name") ||
          get(meta, "supplier") ||
          ""
      ) || "Supplier";

    const startDate = formatDate(
      get(templateData, "start_date") || get(templateData, "agreement_start_date") || ""
    );
    const endDate = formatDate(get(templateData, "end_date") || "");

    const preambleSentence =
      `This Statement of Work is entered into by and between the Supplier, ${supplierName}, for the period ` +
      `${startDate || "Start Date"} to ${endDate || "End Date"}, and is governed by the Master Services Agreement.`;

    children.push(para(preambleSentence, { size: 21, after: 200 }));
  }

  // Work Order Parameters removed (excluded from generation per requirements)

  // Supplier Deliverables (skip if empty)
  const supplierDeliverables = get(templateData, "supplier_deliverables") || "";
  {
    const hasContent = !!String(supplierDeliverables || "").trim();
    if (hasContent) {
      const t = buildTwoColDescriptionTable("Supplier Deliverables", supplierDeliverables);
      if (t) children.push(t);
      else if (isDev) {
        // eslint-disable-next-line no-console
        console.warn("buildSowDocx: Supplier Deliverables table skipped (empty).");
      }
    }
  }

  // Client Deliverables (skip if empty)
  const clientDeliverables = get(templateData, "client_deliverables") || "";
  {
    const hasContent = !!String(clientDeliverables || "").trim();
    if (hasContent) {
      const t = buildTwoColDescriptionTable("Client Deliverables", clientDeliverables);
      if (t) children.push(t);
      else if (isDev) {
        // eslint-disable-next-line no-console
        console.warn("buildSowDocx: Client Deliverables table skipped (empty).");
      }
    }
  }

  // Milestones / Financials (skip if both sides empty)
  {
    const leftDesc = get(templateData, "milestones_description") || get(templateData, "milestones") || "";
    const totalCost = get(templateData, "total_cost");
    const pricingRate = get(templateData, "pricing_rate");
    const hasAny =
      String(leftDesc || "").trim().length > 0 ||
      (totalCost != null && String(totalCost).trim().length > 0) ||
      String(pricingRate || "").trim().length > 0;
    if (hasAny) {
      const t = buildMilestonesFinancials({ templateData });
      if (t) children.push(t);
      else if (isDev) {
        // eslint-disable-next-line no-console
        console.warn("buildSowDocx: Milestones/Financials table skipped (empty).");
      }
    }
  }

  // Continuation table (11..20) - render only if any values exist
  {
    const keys = [
      "client_relationship",
      "negative_relationship_changes",
      "change_payment_structure",
      "rate_or_tnm",
      "key_client_personnel",
      "slas",
      "communication_paths",
      "service_locations",
      "escalation_contact",
      "poc_for_communications"
    ];
    const hasAny = keys.some((k) => {
      const v = get(templateData, k);
      if (Array.isArray(v)) return v.length > 0;
      return v != null && String(v).trim().length > 0;
    });
    if (hasAny) {
      const t = buildContinuationTable({ templateData });
      if (t) children.push(t);
      else if (isDev) {
        // eslint-disable-next-line no-console
        console.warn("buildSowDocx: Continuation table skipped (empty).");
      }
    }
  }

  // Actions metadata table (Section A from assets/actions_section_docx_mapping.md)
  // Per actions_section_docx_mapping.md and user request:
  // - Only one Q/A table must appear.
  // - Supplier/company signature details must not be duplicated in the Q/A table when images are present.
  // - Preserve the strict order and alignment (labels left with underscores preserved; values right).
  {
    const t = buildActionsMetadataTable({ templateData });
    if (t) children.push(t);
    else if (isDev) {
      // eslint-disable-next-line no-console
      console.warn("buildSowDocx: Actions metadata table skipped (empty).");
    }
  }

  // Dynamically enumerate ALL fields from the active schema and render them in schema order.
  // This ensures no user-entered field is omitted regardless of conditionals or new fields.
  if (templateSchema) {
    const allRows = enumerateFieldsFromSchema(templateSchema, templateData);
    if (allRows.length > 0) {
      // Section header
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 120 },
          children: [new TextRun({ text: "All Entered Fields", bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
        })
      );
      // Build a Q/A table in the same order as schema
      const L = 38;
      const V = 62;
      const filteredRows = allRows.filter(({ label }) => {
        const lbl = String(label || "").toLowerCase().trim();
        if (lbl === "work order parameters") return false;
        if (lbl.includes("work order") || lbl.includes("work_order")) return false;
        return true;
      });
      const rows = filteredRows.map(({ label, value }) => {
        const lblLower = String(label || "").toLowerCase().trim();

        // Exclude fields 'Statement of Work', 'To', 'Master Service Agreement' from All Entered Fields
        if (
          lblLower === "statement of work" ||
          lblLower === "statement of work (t&m)" ||
          lblLower === "to" ||
          lblLower === "master services agreement" ||
          lblLower === "[add logo here]" // also omit transcript placeholder if present
        ) {
          return null;
        }

        // Ensure signature image appears after the Signature label cell
        // If this row is a signature and the value is a data URL, render the image in the value cell.
        const isSignatureRow = lblLower.includes("signature") && typeof value === "string";
        if (isSignatureRow && /^data:image\//.test(value)) {
          const imgBytes = (() => {
            try { return dataUrlToBytes(value); } catch { return null; }
          })();
          const valueChildren = imgBytes
            ? [new Paragraph({ children: [new ImageRun({ data: imgBytes, transformation: { width: 220, height: 77 } })] })]
            : toParagraphs(value || "");
          return new TableRow({
            children: [labelCell(label, L), makeCell(valueChildren, { widthPct: V })],
          });
        }

        return new TableRow({ children: [labelCell(label, L), valueCell(value, V)] });
      }).filter(Boolean);
      const t = tableFullWidth(rows);
      if (t) children.push(t);
      else if (isDev) {
        // eslint-disable-next-line no-console
        console.warn("buildSowDocx: Schema-enumerated table skipped (empty).");
      }
    }
  }

  // Authorization preface + table (Section B)
  // Ensure signatures (name/title/date/image) are shown only in the dedicated signature block.
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
