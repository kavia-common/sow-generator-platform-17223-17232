import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, Footer, PageNumber, TabStopType, TabStopPosition } from "docx";

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
 * Adds zebra striping, header row bolding, and full-width layout.
 */
function renderKeyValueTable(rows) {
  const header = new TableRow({
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
  });

  const body = rows.map((r, idx) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: r.label || r.key || "" })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: r.value ?? "" })] })],
        }),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...body],
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

/**
 * Walk any JS object (templateData) and produce flattened key/value pairs such that every field
 * from the form is included, regardless of label/grouping. We skip only binary/image-heavy lists
 * that are not the dedicated logo/signature fields.
 */
function flattenAllFields(root, parentKey = "") {
  const out = [];
  const isLogoKey = (k) => /(^|[._-])logo(url|image)?$/i.test(k);
  const isSignatureKey = (k) => /(^|[._-])signature$/i.test(k);

  const pushKV = (k, v) => {
    // Skip embedding raw data URL images except signature handled separately at the footer
    if (typeof v === "string" && v.startsWith("data:image/")) {
      if (isLogoKey(k) || isSignatureKey(k)) return; // handled elsewhere
      // For any other image-like field, summarize instead of embedding
      out.push({ key: k, label: k, value: "[image]" });
      return;
    }
    out.push({ key: k, label: k, value: formatValue(v) });
  };

  const walk = (obj, base) => {
    if (obj == null) return;
    if (Array.isArray(obj)) {
      // Arrays become comma-joined strings; also include per-index for completeness
      pushKV(base, obj);
      obj.forEach((item, idx) => {
        const next = base ? `${base}[${idx}]` : `[${idx}]`;
        if (item && typeof item === "object") {
          walk(item, next);
        } else {
          pushKV(next, item);
        }
      });
      return;
    }
    if (typeof obj === "object") {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        pushKV(base, obj);
        return;
      }
      keys.forEach((k) => {
        const next = base ? `${base}.${k}` : k;
        const val = obj[k];
        if (val && typeof val === "object") {
          walk(val, next);
        } else {
          pushKV(next, val);
        }
      });
      return;
    }
    // primitives
    pushKV(base, obj);
  };

  walk(root, parentKey);
  return out;
}

/**
 * Map schema to rows (maintain existing behavior), but we will also include any extra fields
 * not present in schema by scanning templateData as a fallback.
 */
function normalizeSchemaToRows(templateSchema, templateData) {
  const rows = [];
  const seen = new Set();

  // From schema (labels preserved)
  if (templateSchema && Array.isArray(templateSchema.sections)) {
    (templateSchema.sections || []).forEach((sec) => {
      (sec.fields || []).forEach((f) => {
        if (f.type === "object" && Array.isArray(f.properties)) {
          const objVal = (templateData || {})[f.key] || {};
          f.properties.forEach((p) => {
            const key = `${f.key}.${p.key}`;
            seen.add(key);
            rows.push({
              key,
              label: `${f.label || f.key} — ${p.label || p.key}`,
              value: formatValue(objVal[p.key]),
            });
          });
        } else {
          seen.add(f.key);
          rows.push({
            key: f.key,
            label: f.label || f.key,
            value: formatValue((templateData || {})[f.key]),
          });
        }
      });
    });
  } else if (templateSchema && Array.isArray(templateSchema.fields)) {
    (templateSchema.fields || []).forEach((f) => {
      seen.add(f.key);
      rows.push({
        key: f.key,
        label: f.label || f.key,
        value: formatValue((templateData || {})[f.key]),
      });
    });
  }

  // Include any additional fields from templateData that weren't captured by schema
  const allFlat = flattenAllFields(templateData || {});
  allFlat.forEach((r) => {
    if (!seen.has(r.key)) {
      rows.push({
        key: r.key,
        label: r.key,
        value: r.value,
      });
    }
  });

  return rows;
}

// PUBLIC_INTERFACE
export async function buildSowDocx(data, templateSchema) {
  /**
   * Build a DOCX Blob from given SOW data and schema.
   * PUBLIC_INTERFACE
   * - Includes every form field as label: value pairs (except raw logo/signature fields which are embedded).
   * - Embeds company logo (top-left) if provided via meta.logoUrl (dataURL).
   * - Places signature image at bottom/footer if provided in templateData (signature or authorization_signatures.signature).
   * - Layout includes: Title, header meta, "All Fields" section, and signature section. No external templates used.
   */
  const meta = data?.meta || {};
  const templateData = data?.templateData || {};
  const bodyChildren = [];

  // Top-left logo
  if (typeof meta.logoUrl === "string" && /^data:image\//.test(meta.logoUrl)) {
    try {
      const bytes = dataUrlToBytes(meta.logoUrl);
      bodyChildren.push(
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
      // ignore invalid logo
    }
  }

  // Title
  const titleText = meta.title || "Statement of Work";
  bodyChildren.push(
    new Paragraph({
      text: titleText,
      heading: HeadingLevel.HEADING_1,
    })
  );

  // Header meta line(s)
  const headerParts = [
    meta.client ? `Client: ${meta.client}` : null,
    meta.project ? `Project: ${meta.project}` : null,
    meta.sowType ? `SOW Type: ${meta.sowType}` : null,
    meta.date ? `Date: ${meta.date}` : null,
  ].filter(Boolean);

  if (headerParts.length) {
    bodyChildren.push(
      new Paragraph({
        children: [new TextRun({ text: headerParts.join(" | ") })],
      })
    );
  }

  // Spacer
  bodyChildren.push(new Paragraph({ text: "" }));

  // All fields from schema + any additional fields from the actual data
  const allRows = normalizeSchemaToRows(templateSchema, templateData);
  if (allRows.length > 0) {
    bodyChildren.push(
      new Paragraph({
        text: "All Fields",
        heading: HeadingLevel.HEADING_2,
      })
    );
    bodyChildren.push(renderKeyValueTable(allRows));
  }

  // Spacer before signature
  bodyChildren.push(new Paragraph({ text: "" }));

  // Signature detection
  const signatureDataUrl =
    (typeof templateData.signature === "string" && templateData.signature) ||
    (typeof templateData.authorization_signatures?.signature === "string" && templateData.authorization_signatures.signature) ||
    null;

  // Footer with signature image if provided, else leave page number only
  let footer;
  if (signatureDataUrl && /^data:image\//.test(signatureDataUrl)) {
    try {
      const sigBytes = dataUrlToBytes(signatureDataUrl);
      footer = new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Authorized Signature:", bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: sigBytes,
                transformation: { width: 240, height: 80 },
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "\t",
              }),
              new TextRun({
                children: ["Page "],
              }),
              new TextRun({
                children: [PageNumber.CURRENT],
              }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          }),
        ],
      });
    } catch {
      // If signature cannot be decoded, fallback to a simple footer with page number
      footer = new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Page " }),
              new TextRun({ children: [PageNumber.CURRENT] }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      });
    }
  } else {
    // Footer without signature
    footer = new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: "Page " }),
            new TextRun({ children: [PageNumber.CURRENT] }),
          ],
          alignment: AlignmentType.RIGHT,
        }),
      ],
    });
  }

  const doc = new Document({
    sections: [
      {
        headers: {},
        footers: { default: footer },
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
  const title = (meta.title || meta.project || "Project").replace(/[^\w-]+/g, "_");
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `SOW_${client}_${title}_${yyyymmdd}.docx`;
}
