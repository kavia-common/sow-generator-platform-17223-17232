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
  PageNumber,
  TabStopType,
  TabStopPosition,
  BorderStyle,
} from "docx";

/**
 * Convert a data URL (image/*) to Uint8Array bytes.
 */
function dataUrlToBytes(dataUrl) {
  const [head, b64] = String(dataUrl || "").split(",");
  const bin = atob(b64 || "");
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
  // Remove underscores-only or sequences used as placeholders
  if (/^_+$/.test(s)) return "";
  return s.replace(/_{2,}/g, " ").trim();
}

function formatValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v
      .map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x)))
      .join(", ");
  }
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
 * Resolve dotted path (e.g., "a.b.c") values from an object.
 */
function get(obj, path, fallback = "") {
  if (!obj || !path) return fallback;
  const parts = String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return fallback;
    cur = cur[p];
  }
  return cur == null ? fallback : cur;
}

/**
 * Build a shaded header row cell.
 */
function headerCell(text) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 21 })], // 10.5 pt
      }),
    ],
  });
}

/**
 * Create a full-width table with uniform borders.
 */
function createBorderedTable(rows, { widthPct = 100 } = {}) {
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: "9B9B9B" }, // ~0.75pt
    bottom: { style: BorderStyle.SINGLE, size: 6, color: "9B9B9B" },
    left: { style: BorderStyle.SINGLE, size: 6, color: "9B9B9B" },
    right: { style: BorderStyle.SINGLE, size: 6, color: "9B9B9B" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "9B9B9B" },
    insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "9B9B9B" },
  };
  return new Table({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows,
  });
}

/**
 * Build the WORK ORDER PROVISIONS table with rows 1..7 and nested 2-col table for Deliverables.
 * Expects fields from templateData and meta.
 */
function buildWorkOrderProvisions({ meta = {}, templateData = {} }) {
  // Extract intended fields safely
  const clientPortfolio = cleanValue(
    get(templateData, "client_portfolio") || get(meta, "client") || ""
  );
  const sowType = cleanValue(meta.sowType || get(templateData, "sow_type") || "");
  const engagementNumber = cleanValue(
    get(templateData, "engagement_number") || ""
  );
  const includedProjects =
    get(templateData, "included_projects") ||
    get(templateData, "projects") ||
    [];
  const includedProjectsText = Array.isArray(includedProjects)
    ? includedProjects.map(formatValue).join(", ")
    : formatValue(includedProjects);

  const planningAssumptions = cleanValue(
    get(templateData, "planning_assumptions") || ""
  );

  // Scope of Work items may be list
  const scopeIntro =
    "This Work Order is issued to document the scope of the consulting & software services to be provided. Following is the scope of work:";
  const scopeItems = get(templateData, "scope_of_work") || get(templateData, "scope.items") || [];
  const scopeArray = Array.isArray(scopeItems)
    ? scopeItems
    : typeof scopeItems === "string" && scopeItems.includes("\n")
    ? scopeItems.split("\n").map((s) => s.trim()).filter(Boolean)
    : scopeItems
    ? [scopeItems]
    : [];

  // Deliverables two-column data
  const deliverables = get(templateData, "deliverables") || [];
  const deliverablesArray = Array.isArray(deliverables)
    ? deliverables
    : typeof deliverables === "object"
    ? Object.keys(deliverables).map((k) => ({ name: k, description: deliverables[k] }))
    : [];

  // Table header row (shaded)
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "WORK ORDER PROVISIONS", bold: true, size: 21 })],
          }),
        ],
        shading: { fill: "E6E6E6", color: "E6E6E6", type: "clear" },
      }),
    ],
  });

  // Helper to make a body row with bold numbered label then content paragraphs
  const makeRow = (label, contentParas) =>
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: label, bold: true, size: 21 })],
            }),
            ...contentParas,
          ],
        }),
      ],
    });

  // Row 1: Client Portfolio
  const row1 = makeRow("1. Client Portfolio:", [
    new Paragraph({ children: [new TextRun({ text: clientPortfolio || "", size: 20 })] }),
  ]);

  // Row 2: Type of Project (SOW Type moved here)
  const row2 = makeRow("2. Type of Project:", [
    new Paragraph({ children: [new TextRun({ text: sowType || "", size: 20 })] }),
  ]);

  // Row 3: Engagement Number
  const row3 = makeRow("3. Engagement Number: (Required for Fixed Price)", [
    new Paragraph({ children: [new TextRun({ text: engagementNumber || "", size: 20 })] }),
  ]);

  // Row 4: Included Projects
  const row4 = makeRow("4. Included Projects (Required for Fixed Price):", [
    new Paragraph({ children: [new TextRun({ text: includedProjectsText || "", size: 20 })] }),
  ]);

  // Row 5: Planning Assumptions (with subtext guidance)
  const row5 = makeRow("5. Planning Assumptions:", [
    new Paragraph({
      children: [
        new TextRun({
          text: "A brief statement of resources assigned or to be assigned to the project.",
          size: 20,
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: planningAssumptions || "", size: 20 })] }),
  ]);

  // Row 6: Scope of Work/Services with intro and bullets
  const row6Children = [
    new Paragraph({
      children: [new TextRun({ text: scopeIntro, size: 20 })],
    }),
  ];
  if (scopeArray.length > 0) {
    // Add bullet paragraphs
    scopeArray.forEach((item) => {
      const txt = cleanValue(formatValue(item));
      row6Children.push(
        new Paragraph({
          children: [new TextRun({ text: txt, size: 20 })],
          bullet: { level: 0 },
        })
      );
    });
  } else {
    row6Children.push(new Paragraph({ children: [new TextRun({ text: "", size: 20 })] }));
  }
  const row6 = makeRow("6. Scope of Work/Services (1): Fixed Price:", row6Children);

  // Row 7: Supplier Deliverables with nested 2-col table
  const nestedHeader = new TableRow({
    children: [
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Deliverables", bold: true, size: 20 })] }),
        ],
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Description", bold: true, size: 20 })] }),
        ],
      }),
    ],
  });

  const nestedRows = (deliverablesArray.length ? deliverablesArray : [{ name: "", description: "" }]).map(
    (d, idx) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cleanValue(d.name || d.title || d.deliverable || ""),
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cleanValue(d.description || d.details || ""),
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
  );

  const nestedTable = createBorderedTable([nestedHeader, ...nestedRows]);

  const row7 = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "7. Supplier Deliverables", bold: true, size: 21 })],
          }),
          new Paragraph({ text: "" }),
          nestedTable,
        ],
      }),
    ],
  });

  return createBorderedTable([headerRow, row1, row2, row3, row4, row5, row6, row7]);
}

/**
 * Build the legal paragraph text under the heading, injecting dynamic fields.
 */
function buildLegalParagraph({ meta = {}, templateData = {} }) {
  const msaDate =
    cleanValue(get(meta, "msaDate") || get(templateData, "msa_date") || get(meta, "date") || "");
  const clientName =
    cleanValue(get(meta, "client") || get(templateData, "client_name") || get(templateData, "company_name") || "");
  const supplierName =
    cleanValue(get(meta, "supplier") || get(templateData, "supplier_name") || get(templateData, "vendor_name") || "");

  const legalText =
    `This Statement of Work references and is executed subject to the terms and conditions of that certain Master Services Agreement dated ${msaDate} previously entered into by and between ${clientName} (“Client”), the limited liability company, and ${supplierName} (“Supplier”). The Work Order is effective when signed by Supplier’s authorized signatory as indicated below.`;

  return new Paragraph({
    children: [new TextRun({ text: legalText, size: 20 })], // 10 pt
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 120, after: 200 }, // ~6pt before, 10pt after
  });
}

// PUBLIC_INTERFACE
export async function buildSowDocx(data, templateSchema) {
  /**
   * Build a DOCX Blob from given SOW data and schema.
   * PUBLIC_INTERFACE
   * Layout:
   * - Logo (top-left) if provided.
   * - Centered bold heading: "Statement of Work" (no SOW type appended).
   * - Legal paragraph (justified) directly under heading.
   * - WORK ORDER PROVISIONS table with numbered rows (SOW Type in row 2).
   * - Signature block at the very bottom with image if available.
   */
  const meta = data?.meta || {};
  const templateData = data?.templateData || {};
  const bodyChildren = [];

  // Logo at top-left (if provided)
  if (typeof meta.logoUrl === "string" && /^data:image\//.test(meta.logoUrl)) {
    try {
      const bytes = dataUrlToBytes(meta.logoUrl);
      bodyChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 }, // small spacing after logo
          children: [
            new ImageRun({
              data: bytes,
              transformation: { width: 180, height: 56 },
            }),
          ],
        })
      );
    } catch {
      // ignore invalid logo
    }
  }

  // Title - explicitly "Statement of Work" centered and bold
  bodyChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Statement of Work", bold: true, size: 26 }), // ~13 pt
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 }, // ~6pt before/after
    })
  );

  // Legal paragraph directly under the heading
  bodyChildren.push(buildLegalParagraph({ meta, templateData }));

  // Space between legal paragraph and main table: ~10 pt (already after in paragraph)
  // Build the WORK ORDER PROVISIONS table
  const provisions = buildWorkOrderProvisions({ meta, templateData });
  bodyChildren.push(provisions);

  // Spacing before signature block
  bodyChildren.push(new Paragraph({ text: "", spacing: { before: 280, after: 140 } })); // ~14-18pt

  // Signature block at bottom
  const signatureDataUrl =
    (typeof templateData.signature === "string" && templateData.signature) ||
    (typeof templateData.authorization_signatures?.signature === "string" &&
      templateData.authorization_signatures.signature) ||
    null;

  // Build a simple signature section at the end (not in footer)
  bodyChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "Authorized Signature:", bold: true, size: 20 })],
      spacing: { after: 100 },
    })
  );

  if (signatureDataUrl && /^data:image\//.test(signatureDataUrl)) {
    try {
      const sigBytes = dataUrlToBytes(signatureDataUrl);
      bodyChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: sigBytes,
              transformation: { width: 240, height: 80 }, // <= 2.5"
            }),
          ],
          spacing: { after: 120 },
          alignment: AlignmentType.LEFT,
        })
      );
    } catch {
      bodyChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "Not signed", italics: true, size: 20 })],
        })
      );
    }
  } else {
    // Leave space and add "Not signed"
    bodyChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "Not signed", italics: true, size: 20 })],
      })
    );
  }

  // Footer with page number only (signature is above as per design)
  const footer = new Footer({
    children: [
      new Paragraph({
        children: [new TextRun({ text: "Page " }), new TextRun({ children: [PageNumber.CURRENT] })],
        alignment: AlignmentType.RIGHT,
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        headers: {},
        footers: { default: footer },
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
          },
        },
        children: bodyChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

// PUBLIC_INTERFACE
export function makeSowDocxFilename(data) {
  /**
   * Generate a meaningful filename like SOW_<client>_<title>_<YYYYMMDD>.docx
   * PUBLIC_INTERFACE
   */
  const meta = data?.meta || {};
  const client = (meta.client || "Client").replace(/[^\w-]+/g, "_");
  const title = (meta.title || meta.project || "Statement_of_Work").replace(/[^\w-]+/g, "_");
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return `SOW_${client}_${title}_${yyyymmdd}.docx`;
}
