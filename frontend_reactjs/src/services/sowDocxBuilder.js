//
// PUBLIC_INTERFACE
// buildSowDocx
// Creates a fresh, valid DOCX document purely from SOW form values, with no templates.
// Uses the "docx" library to build a Word document programmatically and returns a Blob.
//
// The document contains:
// - Optional header with logo image if provided in meta.logoUrl (data URL)
// - Title and meta info (Client, Project Title, Date, SOW Type) if available
// - A table listing all captured fields from templateSchema with readable labels and values
// - Signature image if provided in templateData.signature or templateData.authorization_signatures.signature
//
// Note: This service intentionally avoids template loading and any zip/package error messaging.
//
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun } from "docx";

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
 * Render a simple key/value table from normalized rows.
 */
function renderKeyValueTable(rows) {
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "Field", bold: true })] })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "Value", bold: true })] })],
        }),
      ],
    }),
    ...rows.map((r) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.label || r.key || "" })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.value ?? "" })] })] }),
        ],
      })
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

function formatValue(v) {
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
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
  return String(v);
}

function normalizeSchemaToRows(templateSchema, templateData) {
  if (!templateSchema) return [];
  const rows = [];
  if (Array.isArray(templateSchema.sections)) {
    (templateSchema.sections || []).forEach((sec) => {
      (sec.fields || []).forEach((f) => {
        if (f.type === "object" && Array.isArray(f.properties)) {
          const objVal = (templateData || {})[f.key] || {};
          f.properties.forEach((p) => {
            rows.push({
              key: `${f.key}.${p.key}`,
              label: `${f.label} — ${p.label}`,
              value: formatValue(objVal[p.key]),
            });
          });
        } else {
          rows.push({
            key: f.key,
            label: f.label || f.key,
            value: formatValue((templateData || {})[f.key]),
          });
        }
      });
    });
  } else if (Array.isArray(templateSchema.fields)) {
    (templateSchema.fields || []).forEach((f) => {
      rows.push({
        key: f.key,
        label: f.label || f.key,
        value: formatValue((templateData || {})[f.key]),
      });
    });
  }
  return rows;
}

// PUBLIC_INTERFACE
export async function buildSowDocx(data, templateSchema) {
  /** Build a DOCX Blob from given SOW data and schema. */
  const meta = data?.meta || {};
  const templateData = data?.templateData || {};

  const children = [];

  // Optional logo at top
  if (typeof meta.logoUrl === "string" && meta.logoUrl.startsWith("data:image/")) {
    try {
      const bytes = dataUrlToBytes(meta.logoUrl);
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new ImageRun({
              data: bytes,
              transformation: { width: 180, height: 56 },
            }),
          ],
        })
      );
    } catch {
      // Ignore image decoding issues silently to avoid any template/error messaging.
    }
  }

  // Title and meta header
  const titleText = meta.title || "Statement of Work";
  children.push(
    new Paragraph({
      text: titleText,
      heading: HeadingLevel.HEADING_1,
    })
  );

  const headerMeta = [
    meta.client ? `Client: ${meta.client}` : null,
    meta.project ? `Project: ${meta.project}` : null,
    meta.sowType ? `SOW Type: ${meta.sowType}` : null,
    meta.date ? `Date: ${meta.date}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  if (headerMeta) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: headerMeta })],
      })
    );
  }

  // Spacer
  children.push(new Paragraph({ text: "" }));

  // Fields table
  const rows = normalizeSchemaToRows(templateSchema, templateData);
  if (rows.length > 0) {
    children.push(
      new Paragraph({
        text: "Captured Fields",
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(renderKeyValueTable(rows));
  }

  // Signature section
  const signatureDataUrl =
    (typeof templateData.signature === "string" && templateData.signature) ||
    (typeof templateData.authorization_signatures?.signature === "string" && templateData.authorization_signatures.signature) ||
    null;

  if (signatureDataUrl && signatureDataUrl.startsWith("data:image/")) {
    children.push(new Paragraph({ text: "" }));
    children.push(
      new Paragraph({
        text: "Authorization",
        heading: HeadingLevel.HEADING_2,
      })
    );
    try {
      const bytes = dataUrlToBytes(signatureDataUrl);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Signature:" }),
            new TextRun({ text: "  " }),
            new ImageRun({
              data: bytes,
              transformation: { width: 240, height: 80 },
            }),
          ],
        })
      );
    } catch {
      // Ignore signature decoding problems
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

// PUBLIC_INTERFACE
export function makeSowDocxFilename(data) {
  /** Generate a meaningful filename like SOW_<client>_<title>_<YYYYMMDD>.docx */
  const meta = data?.meta || {};
  const client = (meta.client || "Client").replace(/[^\w-]+/g, "_");
  const title = (meta.title || meta.project || "Project").replace(/[^\w-]+/g, "_");
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `SOW_${client}_${title}_${yyyymmdd}.docx`;
}
