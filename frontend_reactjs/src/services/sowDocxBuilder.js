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
  ImageRun,
} from "docx";

/**
 * PUBLIC_INTERFACE
 * buildSowDocx
 * Builds the complete SOW DOCX document mirroring the step 42 layout:
 * - Top header with logo (if present)
 * - Title + subtitle + intro paragraph (plain centered heading; no box around the title)
 * - Work Order Parameters table (header row + numbered items 1–7)
 * - Supplier Deliverables table
 * - Client Deliverables table
 * - Milestones/Financials table
 * - Continuation Parameters (items 11–20)
 * - Actions (all SOW form fields listed in a two-column table)
 * - Authorization/signature table at the bottom with signature images (if provided) directly under the signature area
 *
 * Inputs:
 * - data: {
 *     meta?: { client?: string, title?: string, sowType?: "TM"|"FP", logoUrl?: string, supplierName?: string, companyName?: string },
 *     templateData?: Record<string, any>
 *   }
 * - templateSchema?: ignored for layout; step 42 layout uses fixed structure/labels
 *
 * Returns: Blob (DOCX)
 */
// PUBLIC_INTERFACE
export async function buildSowDocx(data, _templateSchema) {
  const td = data?.templateData || {};
  const meta = data?.meta || {};

  const children = [];

  // Title block (render as plain heading; no special box/border)
  children.push(titleBlock());
  // Subtitle: "Master Services Agreement" is in titleBlock per reference.
  children.push(introParagraph(meta, td));

  // Work Order Parameters table (items 1–7) with exact labels/order from reference
  children.push(workOrderParametersTable(td));

  // Supplier Deliverables (exact header and subheader "Description")
  children.push(simpleTwoColTable("Supplier Deliverables", td.supplier_deliverables));

  // Client Deliverables (exact header and subheader "Description")
  children.push(simpleTwoColTable("Client Deliverables", td.client_deliverables));

  // Project Milestones and Right column showing Total Cost / Pricing/Rate, with header "Project Milestones"
  children.push(milestonesFinancialsTable(td));

  // Parameters 11–20 with exact wording from reference
  children.push(continuationParametersTable(td));

  // Actions: include ALL SOW form fields as per "Actions" section in reference
  children.push(actionsAllFieldsTable(td));

  // Authorization / Signatures block with "Supplier | Company" headers as per reference
  children.push(authorizationTable(meta, td));

  const doc = new Document({
    sections: [
      {
        headers: { default: buildHeader(meta) },
        footers: { default: buildFooter() },
        properties: {
          page: {
            margin: { top: inchesToTwips(1.0), right: inchesToTwips(0.75), bottom: inchesToTwips(0.75), left: inchesToTwips(0.75) },
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
 * makeSowDocxFilename
 * Generate a filename consistent with step 42 naming.
 */
// PUBLIC_INTERFACE
export function makeSowDocxFilename(data) {
  const meta = data?.meta || {};
  const client = (meta.client || "Client").replace(/[^\w-]+/g, "_");
  const title = (meta.title || meta.project || "SOW").replace(/[^\w-]+/g, "_");
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return `SOW_${client}_${title}_${yyyymmdd}.docx`;
}

/* =========================
   Helpers and layout blocks
   ========================= */

const BORDER_COLOR = "B5B5B5"; // step 42: medium gray borders
const BORDER = {
  top: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
  left: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
  right: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
  insideVertical: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
};

function inchesToTwips(inches) {
  return Math.round(inches * 1440);
}

function para(
  text,
  { bold = false, size = 21, align = AlignmentType.LEFT, after = 120 } = {}
) {
  return new Paragraph({
    alignment: align,
    spacing: { after },
    children: [new TextRun({ text: cleanText(text), bold, size })],
  });
}

function toParagraphs(text, { size = 21, align = AlignmentType.LEFT, after = 0 } = {}) {
  const s = cleanText(text);
  if (!s) {
    return [new Paragraph({ alignment: align, spacing: { after }, children: [new TextRun({ text: "", size })] })];
  }
  const lines = s.split(/\r?\n/);
  if (!lines.length) {
    return [new Paragraph({ alignment: align, spacing: { after }, children: [new TextRun({ text: s, size })] })];
  }
  return lines.map(
    (ln) =>
      new Paragraph({
        alignment: align,
        spacing: { after },
        children: [new TextRun({ text: ln, size })],
      })
  );
}

function tableFullWidth(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER,
    rows: rows || [],
  });
}

/**
 * Build a two-column table that lists ALL keys from templateData under an "Actions" section.
 * Left column: field key (bold), Right column: value (stringified). Arrays and objects are formatted sensibly.
 * Matches rollback 42 approach of surfacing all fields "in action".
 */
function actionsAllFieldsTable(templateData) {
  const rows = [];

  // Header row spanning two columns - exact label from reference
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [para("Actions", { bold: true, size: 22, align: AlignmentType.LEFT })],
        }),
      ],
    })
  );

  const keys = Object.keys(templateData || {});
  keys.sort((a, b) => a.localeCompare(b));
  const L = 38;
  const V = 62;

  for (const k of keys) {
    const raw = templateData[k];
    const valText = formatAnyValue(raw);
    rows.push(
      new TableRow({
        children: [
          makeCell(para(k, { bold: true, align: AlignmentType.LEFT }), { widthPct: L, vAlign: VerticalAlign.CENTER }),
          makeCell(toParagraphs(valText, { align: AlignmentType.LEFT }), { widthPct: V, vAlign: VerticalAlign.TOP }),
        ],
      })
    );
  }

  if (rows.length === 1) {
    // No fields present; show hint row
    rows.push(
      new TableRow({
        children: [
          makeCell(para("No fields", { bold: true }), { widthPct: 38 }),
          makeCell(para("No SOW fields were provided.", {}), { widthPct: 62 }),
        ],
      })
    );
  }

  return tableFullWidth(rows);
}

function formatAnyValue(v) {
  if (v == null) return "";
  if (typeof v === "string") return cleanText(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    // Join arrays by newline; stringify objects shallowly
    return v
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return cleanText(item);
        if (typeof item === "number" || typeof item === "boolean") return String(item);
        if (typeof item === "object") return Object.entries(item).map(([kk, vv]) => `${kk}: ${formatAnyValue(vv)}`).join(", ");
        return String(item);
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v)
      .map(([kk, vv]) => `${kk}: ${formatAnyValue(vv)}`)
      .join("\n");
  }
  return String(v);
}

function makeCell(
  children,
  { widthPct, vAlign = VerticalAlign.TOP, padding = 120, opts = {} } = {}
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

function cleanText(v) {
  if (v == null) return "";
  const s = String(v);
  if (/^_+$/.test(s)) return "";
  return s.replace(/_{2,}/g, " ").trim();
}

function formatDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return cleanText(s);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function dataUrlToUint8Array(dataUrl) {
  const [head, b64] = String(dataUrl || "").split(",");
  const bin = atob(b64 || "");
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/* Title and intro */

function titleBlock() {
  return tableFullWidth([
    new TableRow({
      children: [
        makeCell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [new TextRun({ text: "Statement of Work", bold: true, size: 26 })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              children: [new TextRun({ text: "Master Services Agreement", size: 22 })],
            }),
          ],
          { widthPct: 100, vAlign: VerticalAlign.CENTER }
        ),
      ],
    }),
  ]);
}

function introParagraph(meta, td) {
  const company = meta.companyName || td.company_name || "[company name]";
  const supplier = meta.supplierName || td.supplier_name || "<supplier name>";
  const copy =
    `The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between ${company}, and ${supplier} (the “Supplier”), as amended from time to time (the “Agreement”). ` +
    `Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.`;
  return para(copy, { align: AlignmentType.LEFT, after: 240, size: 21 });
}

/* Work Order Parameters (1–7) */

function workOrderParametersTable(td) {
  const L = 38;
  const V = 62;

  const rows = [];

  // Header row spanning two columns
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [para("Work Order Parameters", { bold: true, size: 22, align: AlignmentType.LEFT })],
        }),
      ],
    })
  );

  const addRow = (label, value, opts = {}) => {
    const valPara =
      opts.format === "date" ? para(formatDate(value), { align: AlignmentType.LEFT }) : para(value, { align: AlignmentType.LEFT });
    return new TableRow({
      children: [
        makeCell(para(label, { bold: true, align: AlignmentType.LEFT }), {
          widthPct: L,
          vAlign: VerticalAlign.CENTER,
        }),
        makeCell(valPara, { widthPct: V, vAlign: VerticalAlign.TOP }),
      ],
    });
  };

  rows.push(addRow("1. Client Portfolio", td.client_portfolio || ""));
  rows.push(addRow("2. Type of Project", td.type_of_project || td.project_type || ""));
  rows.push(addRow("3. Engagement Number (Required for Fixed Price)", td.engagement_number || ""));
  rows.push(addRow("4. Project Start Date", td.start_date || "", { format: "date" }));
  rows.push(addRow("5. Project End Date", td.end_date || "", { format: "date" }));
  rows.push(
    new TableRow({
      children: [
        makeCell(para("6. Planning Assumptions", { bold: true }), { widthPct: L, vAlign: VerticalAlign.CENTER }),
        makeCell(toParagraphs(td.planning_assumptions || "", { align: AlignmentType.LEFT }), {
          widthPct: V,
          vAlign: VerticalAlign.TOP,
        }),
      ],
    })
  );
  rows.push(
    new TableRow({
      children: [
        makeCell(para("7. Scope of Work (Required for Fixed Price)", { bold: true }), {
          widthPct: L,
          vAlign: VerticalAlign.CENTER,
        }),
        makeCell(toParagraphs(td.scope_of_work || "", { align: AlignmentType.LEFT }), {
          widthPct: V,
          vAlign: VerticalAlign.TOP,
        }),
      ],
    })
  );

  return tableFullWidth(rows);
}

/* Supplier / Client Deliverables (simple two-column blocks with a header row) */

function simpleTwoColTable(title, text) {
  const rows = [];

  // Header
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [para(title, { bold: true, size: 22, align: AlignmentType.LEFT })],
        }),
      ],
    })
  );

  // Header for the two columns: "Description" | ""
  rows.push(
    new TableRow({
      children: [
        makeCell(para("Description", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
        makeCell(para("", {}), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );

  // Single content row (left carries most content, right optional)
  rows.push(
    new TableRow({
      children: [
        makeCell(toParagraphs(text || "", { align: AlignmentType.LEFT }), { widthPct: 50, vAlign: VerticalAlign.TOP }),
        makeCell(para("", {}), { widthPct: 50, vAlign: VerticalAlign.TOP }),
      ],
    })
  );

  return tableFullWidth(rows);
}

/* Milestones / Financials */

function milestonesFinancialsTable(td) {
  const rows = [];
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [para("Project Milestones", { bold: true, size: 22, align: AlignmentType.LEFT })],
        }),
      ],
    })
  );

  // Left header "Description" | Right header blank
  rows.push(
    new TableRow({
      children: [
        makeCell(para("Description", { bold: true }), { widthPct: 60, vAlign: VerticalAlign.CENTER }),
        makeCell(para("", {}), { widthPct: 40, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );

  // Content: left = milestones_description; right contains two stacked labeled rows: Total Cost, Pricing/Rate
  rows.push(
    new TableRow({
      children: [
        makeCell(toParagraphs(td.milestones_description || "", { align: AlignmentType.LEFT }), {
          widthPct: 60,
          vAlign: VerticalAlign.TOP,
        }),
        makeCell(
          [
            para(`Total Cost:`, { align: AlignmentType.LEFT, bold: true, after: 60 }),
            ...toParagraphs(cleanText(td.total_cost || ""), { align: AlignmentType.LEFT, after: 120 }),
            para(`Pricing/Rate:`, { align: AlignmentType.LEFT, bold: true, after: 60 }),
            ...toParagraphs(cleanText(td.pricing_rate || td.contractor_rate_tm_only || ""), { align: AlignmentType.LEFT }),
          ],
          { widthPct: 40, vAlign: VerticalAlign.TOP }
        ),
      ],
    })
  );

  return tableFullWidth(rows);
}

/* Continuation Parameters (11–20) */

function continuationParametersTable(td) {
  const L = 38;
  const V = 62;

  const rows = [];

  const addRow = (label, value) =>
    new TableRow({
      children: [
        makeCell(para(label, { bold: true, align: AlignmentType.LEFT }), {
          widthPct: L,
          vAlign: VerticalAlign.CENTER,
        }),
        makeCell(toParagraphs(value || "", { align: AlignmentType.LEFT }), {
          widthPct: V,
          vAlign: VerticalAlign.TOP,
        }),
      ],
    });

  rows.push(addRow("11. Client Relationship", td.client_relationship || td.client_relationship_managers || ""));
  rows.push(addRow("12. Negative Relationship Changes", td.negative_relationship_changes || ""));
  rows.push(addRow("13. Change & Payment Structure (Fixed Price Only)", td.charges_and_payment_schedule_fp || td.change_payment_structure || ""));
  rows.push(addRow("14. Deliverable Rate / T&M", td.contractor_rate_tm_only || td.rate_or_tnm || ""));
  rows.push(addRow("15. Key Client Personnel and Reportees", td.key_client_personnel_and_expert_roles || td.key_client_personnel || ""));
  rows.push(addRow("16. Service Level Agreements", td.slas || "N/A"));
  rows.push(addRow("17. Communication Paths", td.communication_paths || "As defined in the Agreement."));
  rows.push(addRow("18. Service Locations", td.service_locations || ""));
  rows.push(addRow("19. Escalation Contact", td.escalation_contact || ""));
  rows.push(
    addRow(
      "20. Points of Contact for Communications",
      formatPocList(td.poc_for_communications || td.points_of_contact_for_communications)
    )
  );

  return tableFullWidth(rows);
}

function formatPocList(poc) {
  // Allow array or string. If array of objects, format "Name – Contact, Email, Address"
  if (!poc) return "";
  if (Array.isArray(poc)) {
    const lines = poc
      .map((p) => {
        if (p && typeof p === "object") {
          const name = cleanText(p.name || p.employee || "");
          const contact = cleanText(p.contact || "");
          const email = cleanText(p.email || "");
          const address = cleanText(p.address || "");
          const parts = [name, contact && `– ${contact}`, email && `, ${email}`, address && `, ${address}`]
            .filter(Boolean)
            .join("");
          return parts || "";
        }
        return cleanText(p);
      })
      .filter((x) => x);
    return lines.join("\n");
  }
  return cleanText(poc);
}

/* Authorization / Signatures */

function authorizationTable(meta, td) {
  const rows = [];

  // Intro sentence above signature blocks
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 2,
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [
            para(
              "An authorized representative of each party has executed this Work Order as of the date indicated under that representative’s signature.",
              { align: AlignmentType.LEFT }
            ),
          ],
        }),
      ],
    })
  );

  // Column headers: Supplier | Company
  const company = meta.companyName || td.client_company_name_signature_block || td.company_name || "Company";
  rows.push(
    new TableRow({
      children: [
        makeCell(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Supplier", bold: true })],
          }),
          { widthPct: 50, vAlign: VerticalAlign.CENTER }
        ),
        makeCell(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: company, bold: true })],
          }),
          { widthPct: 50, vAlign: VerticalAlign.CENTER }
        ),
      ],
    })
  );

  // Signature row with large empty space, followed by signature images if provided.
  const supplierSignatureImg = td?.supplier_signature && String(td.supplier_signature).startsWith("data:image")
    ? new ImageRun({
        data: dataUrlToUint8Array(td.supplier_signature),
        transformation: { width: 240, height: 90 }, // sized to appear below signature area
      })
    : null;
  const clientSignatureImg = td?.client_signature && String(td.client_signature).startsWith("data:image")
    ? new ImageRun({
        data: dataUrlToUint8Array(td.client_signature),
        transformation: { width: 240, height: 90 },
      })
    : null;

  // Signature label/area cells
  rows.push(
    new TableRow({
      children: [
        makeCell(
          [
            para("Signature", { bold: true }),
            // if image exists, add it immediately under the signature area
            ...(supplierSignatureImg ? [new Paragraph({ children: [supplierSignatureImg] })] : []),
          ],
          {
            widthPct: 50,
            vAlign: VerticalAlign.TOP,
            opts: { margins: { top: inchesToTwips(0.2), bottom: inchesToTwips(0.8), left: 120, right: 120 } },
          }
        ),
        makeCell(
          [
            para("Signature", { bold: true }),
            ...(clientSignatureImg ? [new Paragraph({ children: [clientSignatureImg] })] : []),
          ],
          {
            widthPct: 50,
            vAlign: VerticalAlign.TOP,
            opts: { margins: { top: inchesToTwips(0.2), bottom: inchesToTwips(0.8), left: 120, right: 120 } },
          }
        ),
      ],
    })
  );

  // Name
  rows.push(
    new TableRow({
      children: [
        makeCell(para("Name:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
        makeCell(para("Name:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );
  // Title
  rows.push(
    new TableRow({
      children: [
        makeCell(para("Title:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
        makeCell(para("Title:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );
  // Date
  rows.push(
    new TableRow({
      children: [
        makeCell(para("Date:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
        makeCell(para("Date:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );

  return tableFullWidth(rows);
}

/* Header / Footer (minimal per step 42 spec) */

function buildHeader(meta) {
  // Place logo (if provided) at the top-left of the document in the header.
  // No signature area in header; signature block is placed at the bottom Authorization section.
  const runs = [];

  // Logo: use docx ImageRun only for data URLs (browser environment)
  const logoUrl = meta?.logoUrl;
  if (logoUrl && typeof logoUrl === "string" && logoUrl.startsWith("data:image")) {
    try {
      const imgRun = new ImageRun({
        data: dataUrlToUint8Array(logoUrl),
        transformation: {
          width: 180,
          height: 56,
        },
      });
      runs.push(new Paragraph({ children: [imgRun] }));
    } catch {
      // Fallback to text if data URL parsing fails
      runs.push(para("[logo]", { align: AlignmentType.LEFT }));
    }
  } else {
    // No logo; keep header minimal.
  }

  return new Header({ children: runs });
}
function buildFooter() {
  // Thin rule not implemented to keep parity with previously shipped code snapshot that had empty footer.
  return new Footer({ children: [] });
}
