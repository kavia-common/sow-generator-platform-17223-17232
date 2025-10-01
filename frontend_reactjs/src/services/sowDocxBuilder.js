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
  if (Array.isArray(v)) {
    // If it's an array of primitives/objects, join with new lines for readability
    return v
      .map((x) =>
        x && typeof x === "object"
          ? Object.keys(x)
              .map((k) => `${k}: ${formatValue(x[k])}`)
              .join(", ")
          : String(x)
      )
      .join("\n");
  }
  if (typeof v === "object") {
    // For objects, prefer a simple k: v; k2: v2 string
    try {
      return Object.keys(v)
        .map((k) => `${k}: ${formatValue(v[k])}`)
        .join("; ");
    } catch {
      return JSON.stringify(v);
    }
  }
  // For data URLs (images), show a placeholder text
  if (typeof v === "string" && /^data:image\//.test(v)) {
    return "[Image]";
  }
  return cleanValue(String(v));
}

/**
 * Extract all fields (label/key/type) from either the provided templateSchema (prefer sections)
 * or by inferring from templateData keys. Ensures no field is omitted.
 */
function collectAllFieldsForActions(templateSchema, templateData) {
  const fields = [];
  const seenKeys = new Set();

  const pushField = (label, key, type = "text") => {
    if (!key) key = normalizeLabel(label);
    if (!label) label = key;
    const sk = String(key);
    if (seenKeys.has(sk)) return;
    seenKeys.add(sk);
    fields.push({ label, key: sk, type });
  };

  // 1) From schema.sections if available
  if (templateSchema && Array.isArray(templateSchema.sections)) {
    for (const sec of templateSchema.sections) {
      for (const f of sec.fields || []) {
        if (f.type === "object" && Array.isArray(f.properties)) {
          // Add parent and properties as individual fields for Actions visibility
          pushField(f.label || f.key, f.key, "object");
          for (const p of f.properties) {
            pushField(
              `${f.label || f.key} - ${p.label || p.key}`,
              `${f.key}.${p.key}`,
              p.type || "text"
            );
          }
        } else {
          pushField(f.label || f.key, f.key, f.type || "text");
        }
      }
    }
  } else if (templateSchema && Array.isArray(templateSchema.fields)) {
    // 2) From flat schema
    for (const f of templateSchema.fields) {
      if (f.type === "object" && Array.isArray(f.properties)) {
        pushField(f.label || f.key, f.key, "object");
        for (const p of f.properties) {
          pushField(
            `${f.label || f.key} - ${p.label || p.key}`,
            `${f.key}.${p.key}`,
            p.type || "text"
          );
        }
      } else {
        pushField(f.label || f.key, f.key, f.type || "text");
      }
    }
  }

  // 3) Ensure any keys present in templateData are included even if schema missed them
  function walk(prefix, val) {
    if (val == null) {
      pushField(prefix, prefix, "text");
      return;
    }
    if (Array.isArray(val)) {
      pushField(prefix, prefix, "list");
      val.forEach((item, idx) => {
        const childKey = `${prefix}[${idx}]`;
        if (typeof item === "object" && item !== null) {
          walk(childKey, item);
        } else {
          pushField(`${prefix} [${idx}]`, childKey, "text");
        }
      });
      return;
    }
    if (typeof val === "object") {
      pushField(prefix, prefix, "object");
      Object.keys(val).forEach((k) => walk(`${prefix}.${k}`, val[k]));
      return;
    }
    pushField(prefix, prefix, "text");
  }

  if (templateData && typeof templateData === "object") {
    Object.keys(templateData).forEach((k) => walk(k, templateData[k]));
  }

  return fields;
}

/**
 * Get value by dotted path, supporting array indices like field[0].name.
 */
function getByPath(obj, path, fallback = "") {
  if (!obj || !path) return fallback;
  const tokens = String(path)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".");
  let cur = obj;
  for (const t of tokens) {
    if (cur == null) return fallback;
    cur = cur[t];
  }
  return cur == null ? fallback : cur;
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
 * Common styles and helpers for layout
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
 * Build an Actions table listing every field as Question (left) / Answer (right).
 * Ensures consistent alignment: labels left, values left, with fixed 40/60 width split.
 */
function buildActionsTable({ templateSchema, templateData }) {
  const L = 40;
  const V = 60;
  const rows = [];

  // Header row spanning both columns
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

  // Collect union of all fields from schema and current data
  const allFields = collectAllFieldsForActions(templateSchema, templateData);

  // Deduplicate by label+key (already handled in collect function)
  for (const f of allFields) {
    // Retrieve value
    const raw = getByPath(templateData, f.key, "");
    const display =
      f.type === "date" ? formatDate(raw) : f.type === "currency" ? formatCurrency(raw) : formatValue(raw);

    rows.push(
      new TableRow({
        children: [labelCell(f.label || f.key, L), valueCell(display || "", V)],
      })
    );
  }

  return tableFullWidth(rows);
}

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
  const num =
    typeof val === "number" ? val : Number(String(val).replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return cleanValue(val);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      num
    );
  } catch {
    return num.toFixed(2);
  }
}

/**
 * Build top title + subtitle + intro paragraph
 */
function buildTopIntro({ meta = {}, templateData = {} }) {
  const companyName =
    get(templateData, "company_name") ||
    get(meta, "client") ||
    get(templateData, "client_name") ||
    "";
  const supplierName =
    get(templateData, "supplier_name") ||
    get(meta, "supplier") ||
    get(templateData, "vendor_name") ||
    "";

  const nodes = [];
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
      spacing: { after: 240 },
      children: [new TextRun({ text: "Master Services Agreement", size: 22 })],
    })
  );

  const intro =
    `The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between ${cleanValue(
      companyName
    )}, and ${cleanValue(
      supplierName
    )} (the “Supplier”), as amended from time to time (the “Agreement”). ` +
    `Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. ` +
    `This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.`;

  nodes.push(para(intro, { size: 21, after: 240 }));
  return nodes;
}

/**
 * Parameters table: rows 1..7
 */
function buildParametersTable({ templateData = {} }) {
  const L = 40;
  const V = 60;
  const rows = [];

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

  const pushRow = (label, value) => {
    rows.push(
      new TableRow({
        children: [labelCell(label, L), valueCell(value ?? "", V)],
      })
    );
  };

  pushRow("1. Client Portfolio", cleanValue(templateData.client_portfolio));
  pushRow("2. Type of Project", cleanValue(templateData.project_type));
  pushRow(
    "3. Engagement Number (Required for Fixed Price)",
    cleanValue(templateData.engagement_number)
  );
  pushRow("4. Project Start Date", formatDate(templateData.start_date));
  pushRow("5. Project End Date", formatDate(templateData.end_date));
  pushRow(
    "6. Planning Assumptions",
    cleanValue(templateData.planning_assumptions)
  );
  pushRow("7. Scope of Work (Required for Fixed Price)", cleanValue(templateData.scope_of_work));

  return tableFullWidth(rows);
}

/**
 * Two-column description table for deliverables sections
 */
function buildTwoColDescriptionTable(title, leftText, rightHeader = "", rightValue = "") {
  const rows = [];
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [para(title, { bold: true, size: 22, after: 40 })],
          columnSpan: 2,
        }),
      ],
    })
  );

  rows.push(
    new TableRow({
      children: [labelCell("Description", 40), valueCell("", 60)],
    })
  );

  rows.push(
    new TableRow({
      children: [valueCell(leftText || "", 40), valueCell(rightHeader ? `${rightHeader}: ${rightValue || ""}` : "", 60)],
    })
  );

  return tableFullWidth(rows);
}

/**
 * Milestones and Financials (left: description, right: totals)
 */
function buildMilestonesFinancials({ templateData = {}, currency }) {
  const rows = [];

  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [para("Project Milestones", { bold: true, size: 22, after: 40 })],
          columnSpan: 2,
        }),
      ],
    })
  );

  rows.push(
    new TableRow({
      children: [labelCell("Description", 40), valueCell("", 60)],
    })
  );

  const desc = cleanValue(templateData.milestones_description || templateData.milestones);
  const totalCost = formatCurrency(
    templateData.total_cost ?? templateData.project_total ?? templateData.overall_cost,
    currency || templateData.currency || "USD"
  );
  const pricing = cleanValue(
    templateData.pricing_rate ??
      templateData.rate ??
      templateData.rate_card ??
      templateData.contractor_rate ??
      templateData.contractor_rate_per_hr
  );

  rows.push(
    new TableRow({
      children: [valueCell(desc, 40), valueCell(`Total Cost: ${totalCost}`, 60)],
    })
  );
  rows.push(
    new TableRow({
      children: [valueCell("", 40), valueCell(`Pricing/Rate: ${pricing}`, 60)],
    })
  );

  return tableFullWidth(rows);
}

/**
 * Continuation items 11..20
 */
function buildContinuationTable({ templateData = {} }) {
  const L = 40;
  const V = 60;
  const rows = [];
  const pushRow = (label, value) => {
    rows.push(
      new TableRow({
        children: [labelCell(label, L), valueCell(value ?? "", V)],
      })
    );
  };

  pushRow("11. Client Relationship", cleanValue(templateData.client_relationship));
  pushRow(
    "12. Negative Relationship Changes",
    cleanValue(templateData.negative_relationship_changes)
  );
  pushRow(
    "13. Change & Payment Structure (Fixed Price Only)",
    cleanValue(templateData.change_payment_structure)
  );
  pushRow("14. Deliverable Rate / T&M", cleanValue(templateData.rate_or_tnm));
  pushRow(
    "15. Key Client Personnel and Reportees",
    cleanValue(templateData.key_client_personnel)
  );
  pushRow("16. Service Level Agreements", cleanValue(templateData.slas || "N/A"));
  pushRow(
    "17. Communication Paths",
    cleanValue(templateData.communication_paths || "As defined in the Agreement.")
  );
  pushRow("18. Service Locations", cleanValue(templateData.service_locations));
  pushRow("19. Escalation Contact", cleanValue(templateData.escalation_contact));
  // For 20, allow multi-line or structured
  const poc = Array.isArray(templateData.poc_for_communications)
    ? templateData.poc_for_communications
        .map((p) =>
          [p.name, p.contact, p.email, p.address]
            .filter(Boolean)
            .map((x) => cleanValue(x))
            .join(", ")
        )
        .join("\n")
    : cleanValue(templateData.poc_for_communications);
  pushRow("20. Points of Contact for Communications", poc);

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
 * Authorization block with signatures
 */
function buildAuthorization({ templateData = {} }) {
  const nodes = [];
  nodes.push(
    para(
      "An authorized representative of each party has executed this Work Order as of the date indicated under that representative’s signature.",
      { size: 21, after: 120 }
    )
  );

  const supplierSig =
    templateData?.supplier_signature ||
    templateData?.authorization_signatures?.supplier_signature;
  const clientSig =
    templateData?.client_signature ||
    templateData?.authorization_signatures?.client_signature;

  const sigHeightPx = 77;

  const supplierChildren = [
    para("Supplier", { bold: true }),
    supplierSig && /^data:image\//.test(supplierSig)
      ? new Paragraph({
          children: [
            new ImageRun({
              data: dataUrlToBytes(supplierSig),
              transformation: { width: 220, height: sigHeightPx },
            }),
          ],
        })
      : para(""),
    para("Name: " + cleanValue(templateData?.supplier_signer_name || "")),
    para("Title: " + cleanValue(templateData?.supplier_signer_title || "")),
    para("Date: " + cleanValue(templateData?.supplier_sign_date || "")),
  ];

  const clientChildren = [
    para("Company", { bold: true }),
    clientSig && /^data:image\//.test(clientSig)
      ? new Paragraph({
          children: [
            new ImageRun({
              data: dataUrlToBytes(clientSig),
              transformation: { width: 220, height: sigHeightPx },
            }),
          ],
        })
      : para(""),
    para("Name: " + cleanValue(templateData?.client_signer_name || "")),
    para("Title: " + cleanValue(templateData?.client_signer_title || "")),
    para("Date: " + cleanValue(templateData?.client_sign_date || "")),
  ];

  nodes.push(
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

  return nodes;
}

/**
 * Footer (empty border line placeholder if needed)
 */
function buildFooter() {
  return new Footer({ children: [] });
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

  // Top section
  children.push(...buildTopIntro({ meta, templateData }));

  // Parameters (1..7)
  children.push(buildParametersTable({ templateData }));

  // Supplier Deliverables
  children.push(
    buildTwoColDescriptionTable(
      "Supplier Deliverables",
      cleanValue(templateData.supplier_deliverables || "")
    )
  );

  // Client Deliverables
  children.push(
    buildTwoColDescriptionTable(
      "Client Deliverables",
      cleanValue(templateData.client_deliverables || "")
    )
  );

  // Milestones & Financials
  children.push(
    buildMilestonesFinancials({
      templateData,
      currency: templateData.currency || "USD",
    })
  );

  // Continuation 11..20
  children.push(buildContinuationTable({ templateData }));

  // Actions table: include all user-entered fields with left/right alignment
  children.push(buildActionsTable({ templateSchema, templateData }));

  // Authorization
  children.push(...buildAuthorization({ templateData }));

  const footer = buildFooter();
  const header = buildHeader({ meta, templateData });

  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        footers: { default: footer },
        properties: {
          page: {
            margin: { top: 1440, right: 1080, bottom: 1080, left: 1080 },
            size: { width: 11907, height: 16839 }, // A4
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
  const title = (meta.title || meta.project || "Statement_of_Work").replace(
    /[^\w-]+/g,
    "_"
  );
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}`;
  return `SOW_${client}_${title}_${yyyymmdd}.docx`;
}
