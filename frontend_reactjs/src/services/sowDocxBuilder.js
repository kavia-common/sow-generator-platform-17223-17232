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
 * Restored to step 38: includes Actions section listing all SOW fields, classic headings,
 * and signature fields/placement as in that revision.
 *
 * Inputs:
 * - data: {
 *     meta?: { client?: string, title?: string, sowType?: "TM"|"FP", logoUrl?: string, supplierName?: string, companyName?: string },
 *     templateData?: Record<string, any>
 *   }
 * - templateSchema?: not used for fixed layout
 *
 * Returns: Blob (DOCX)
 */
// PUBLIC_INTERFACE
export async function buildSowDocx(data, _templateSchema) {
  const td = data?.templateData || {};
  const meta = data?.meta || {};

  const children = [];

  // Title and intro
  children.push(titleBlockStep38());
  children.push(introParagraphStep38(meta, td));

  // Parameters and sections per step 38
  children.push(workOrderParametersTableStep38(td));
  children.push(simpleTwoColTableStep38("Supplier Deliverables", td.supplier_deliverables));
  children.push(simpleTwoColTableStep38("Client Deliverables", td.client_deliverables));
  children.push(milestonesFinancialsTableStep38(td));
  children.push(continuationParametersTableStep38(td));

  // Actions section listing all fields
  children.push(actionsAllFieldsTableStep38(td));

  // Authorization with signature handling as of step 38
  children.push(authorizationTableStep38(meta, td));

  const doc = new Document({
    sections: [
      {
        headers: { default: buildHeaderStep38(meta) },
        footers: { default: buildFooterStep38() },
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
 * Step 38 filename convention.
 */
// PUBLIC_INTERFACE
export function makeSowDocxFilename(data) {
  const meta = data?.meta || {};
  const client = (meta.client || "Client").replace(/[^\w-]+/g, "_");
  const title = (meta.title || meta.project || "Statement_of_Work").replace(/[^\w-]+/g, "_");
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return `SOW_${client}_${title}_${yyyymmdd}.docx`;
}

/* =========================
   Helpers (shared)
   ========================= */

const BORDER_COLOR = "B5B5B5";
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

/* =========================
   Step 38 specific blocks
   ========================= */

function titleBlockStep38() {
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

function introParagraphStep38(meta, td) {
  const company = meta.companyName || td.company_name || "[company name]";
  const supplier = meta.supplierName || td.supplier_name || "<supplier name>";
  const copy =
    `The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between ${company}, and ${supplier} (the “Supplier”), as amended from time to time (the “Agreement”). ` +
    `Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.`;
  return para(copy, { align: AlignmentType.LEFT, after: 240, size: 21 });
}

function workOrderParametersTableStep38(td) {
  const L = 38;
  const V = 62;

  const rows = [];

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

function simpleTwoColTableStep38(title, text) {
  const rows = [];

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

  rows.push(
    new TableRow({
      children: [
        makeCell(para("Description", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
        makeCell(para("", {}), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );

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

function milestonesFinancialsTableStep38(td) {
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

  rows.push(
    new TableRow({
      children: [
        makeCell(para("Description", { bold: true }), { widthPct: 60, vAlign: VerticalAlign.CENTER }),
        makeCell(para("", {}), { widthPct: 40, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );

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

function continuationParametersTableStep38(td) {
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
      formatPocListStep38(td.poc_for_communications || td.points_of_contact_for_communications)
    )
  );

  return tableFullWidth(rows);
}

function formatPocListStep38(poc) {
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

function actionsAllFieldsTableStep38(templateData) {
  const rows = [];

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
    const valText = formatAnyValueStep38(raw);
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

function formatAnyValueStep38(v) {
  if (v == null) return "";
  if (typeof v === "string") return cleanText(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return cleanText(item);
        if (typeof item === "number" || typeof item === "boolean") return String(item);
        if (typeof item === "object") return Object.entries(item).map(([kk, vv]) => `${kk}: ${formatAnyValueStep38(vv)}`).join(", ");
        return String(item);
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v)
      .map(([kk, vv]) => `${kk}: ${formatAnyValueStep38(vv)}`)
      .join("\n");
  }
  return String(v);
}

function authorizationTableStep38(meta, td) {
  const rows = [];

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

  const supplierSignatureImg = td?.supplier_signature && String(td.supplier_signature).startsWith("data:image")
    ? new ImageRun({
        data: dataUrlToUint8Array(td.supplier_signature),
        transformation: { width: 240, height: 90 },
      })
    : null;
  const clientSignatureImg = td?.client_signature && String(td.client_signature).startsWith("data:image")
    ? new ImageRun({
        data: dataUrlToUint8Array(td.client_signature),
        transformation: { width: 240, height: 90 },
      })
    : null;

  rows.push(
    new TableRow({
      children: [
        makeCell(
          [
            para("Signature", { bold: true }),
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

  rows.push(
    new TableRow({
      children: [
        makeCell(para("Name:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
        makeCell(para("Name:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );
  rows.push(
    new TableRow({
      children: [
        makeCell(para("Title:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
        makeCell(para("Title:", { bold: true }), { widthPct: 50, vAlign: VerticalAlign.CENTER }),
      ],
    })
  );
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

function buildHeaderStep38(meta) {
  const runs = [];
  const logoUrl = meta?.logoUrl;
  if (logoUrl && typeof logoUrl === "string" && logoUrl.startsWith("data:image")) {
    try {
      const imgRun = new ImageRun({
        data: dataUrlToUint8Array(logoUrl),
        transformation: { width: 180, height: 56 },
      });
      runs.push(new Paragraph({ children: [imgRun] }));
    } catch {
      runs.push(para("[logo]", { align: AlignmentType.LEFT }));
    }
  }
  return new Header({ children: runs });
}

function buildFooterStep38() {
  return new Footer({ children: [] });
}
