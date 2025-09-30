//
// PUBLIC_INTERFACE
// strictDocxTemplateMergeService
// Strictly uses the uploaded DOCX transcript text as the base. It detects placeholders and performs
// direct, in-place interpolation with user values. Unfilled placeholders remain unchanged (left blank).
// No new sections, styles, or layout elements are added beyond original structure. The merged content
// is wrapped into a minimal DOCX container that maintains paragraph-by-line fidelity.
//
// This avoids generating any custom template or overlay logic and ensures output is visually the same
// as the provided transcript except for inserted user data.

//
// PUBLIC_INTERFACE
// getLatestTemplateAttachmentPaths
// Re-export of latest attachments for convenience in this service.
//
export function getLatestTemplateAttachmentPaths() {
  return {
    FP: [
      '/attachments/20250930_160627_Fixed%20price_Supplier_SoW_Template(docx).txt',
      '/attachments/20250930_035346_Fixed%20price_Supplier_SoW_Template(docx).txt'
    ],
    TM: [
      '/attachments/20250930_160627_T%26M_Supplier_SoW_Template(docx).txt',
      '/attachments/20250930_035345_T%26M_Supplier_SoW_Template(docx).txt'
    ]
  };
}

// PUBLIC_INTERFACE
export async function loadTemplateTranscript(templateType) {
  const all = getLatestTemplateAttachmentPaths();
  const candidates = all[templateType] || [];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0) return text;
      }
    } catch {
      // try next candidate
    }
  }
  throw new Error(`Template transcript not found for ${templateType}`);
}

// PUBLIC_INTERFACE
// extractPlaceholders
// Finds [Field] and <Field> tokens in the transcript; returns unique list preserving order.
export function extractPlaceholders(transcriptText) {
  const text = String(transcriptText || '');
  const patterns = [
    /\[([^\]\n]+)\]/g,
    /<([^>\n]+)>/g
  ];
  const seen = new Set();
  const out = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const label = String(m[1] || '').replace(/\s+/g, ' ').trim();
      if (!label) continue;
      const key = normalizeKey(label);
      if (!seen.has(label)) {
        seen.add(label);
        out.push({ label, key });
      }
    }
  }
  return out;
}

// PUBLIC_INTERFACE
// interpolateTranscriptStrict
// Replace placeholders in transcript strictly with provided values.
// If mapping returns empty/undefined/null => leave placeholder unchanged per requirement.
// To leave placeholders unchanged, we return the original token if value is empty.
export function interpolateTranscriptStrict(transcriptText, mapping) {
  const text = String(transcriptText || '');

  // When there's no value, return a user-friendly fill-in line "__________"
  const EMPTY_FILL = ' __________ ';

  function replaceToken(full, inner) {
    const raw = String(inner || '');
    const label = raw.replace(/\s+/g, ' ').trim();
    const key = normalizeKey(label);
    const val = mapping ? mapping(label, key) : undefined;
    if (val == null || String(val) === '') {
      return EMPTY_FILL;
    }
    return String(val);
  }

  let out = text.replace(/\[([^\]\n]+)\]/g, (full, inner) => replaceToken(full, inner));
  out = out.replace(/<([^>\n]+)>/g, (full, inner) => replaceToken(full, inner));

  return out;
}

// PUBLIC_INTERFACE
// mapUserDataForTemplateStrict
// Mapping function for interpolateTranscriptStrict using data.templateData with some aliases.
// Only returns strings for found values; otherwise undefined to keep placeholders unchanged.
export function mapUserDataForTemplateStrict(data) {
  const templateData = (data && data.templateData) || {};
  return (label, key) => {
    if (Object.prototype.hasOwnProperty.call(templateData, key)) {
      return friendly(templateData[key]);
    }
    // Authorization sub-keys
    const auth = templateData.authorization_signatures || {};
    if (key.startsWith('supplier_signature_') || key.startsWith('client_signature_')) {
      if (auth[key] != null) return friendly(auth[key]);
      const alt = key.replace(/^supplier_/, '').replace(/^client_/, '');
      if (auth[alt] != null) return friendly(auth[alt]);
    }
    const altKey = tryResolveAltKey(key, templateData);
    if (altKey && templateData[altKey] != null) return friendly(templateData[altKey]);
    // otherwise undefined to preserve original placeholder token
    return undefined;
  };
}

function friendly(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  if (typeof v === 'object') {
    try {
      return Object.keys(v).map((k) => `${k}: ${friendly(v[k])}`).join('; ');
    } catch {
      return JSON.stringify(v);
    }
  }
  return String(v);
}

function tryResolveAltKey(key, templateData) {
  const map = {
    start_date: 'start_date',
    end_date: 'end_date',
    client_name: 'client_company_name',
    supplier_name: 'supplier_name',
    engagement_number: 'engagement_number',
    scope_of_work: 'scope_of_work',
  };
  if (map[key]) return map[key];
  const auth = templateData.authorization_signatures || {};
  if (key in auth) return `authorization_signatures.${key}`;
  return null;
}

function normalizeKey(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// PUBLIC_INTERFACE
// generateDocxFromTranscriptLines
// Convert merged transcript to basic paragraph DOCX while not altering content beyond token substitution.
// Each line preserved as-is using xml:space="preserve".
export function generateDocxFromTranscriptLines(mergedTranscript, { logoDataUrl } = {}) {
  const lines = String(mergedTranscript || '').split(/\r?\n/);

  const media = {};
  const rels = [];
  let nextRid = 3;
  let logoRid = null;

  if (logoDataUrl && /^data:image\//.test(logoDataUrl)) {
    const { bytes, ext } = dataUrlToBytes(logoDataUrl);
    const name = `media/logo.${ext}`;
    media[`word/${name}`] = bytes;
    logoRid = `rId${nextRid++}`;
    rels.push({ id: logoRid, type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', target: name });
  }

  function escapeXml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const parts = [];
  if (logoRid) {
    parts.push(inlineImageXml(logoRid, 180, 56));
  }
  lines.forEach((ln) => {
    parts.push(`<w:p><w:r><w:t xml:space="preserve">${escapeXml(ln)}</w:t></w:r></w:p>`);
  });

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    ${parts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const files = {};
  files['[Content_Types].xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  files['_rels/.rels'] = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const relsXml = [
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    ...rels.map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`)
  ].join('\n');

  files['word/_rels/document.xml.rels'] = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${relsXml}
</Relationships>`;

  files['word/document.xml'] = documentXml;
  files['word/styles.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>`;

  Object.keys(media).forEach((k) => (files[k] = media[k]));
  return files;
}

// PUBLIC_INTERFACE
// zipSync
export function zipSync(fileMap) {
  const textEncoder = new TextEncoder();
  const fileEntries = [];
  const centralEntries = [];
  let offset = 0;

  const DOS_TIME = 0;
  const DOS_DATE = 0;

  Object.keys(fileMap).forEach((filename) => {
    const val = fileMap[filename];
    const content = typeof val === 'string' ? textEncoder.encode(val) : val;
    const nameBytes = textEncoder.encode(filename);
    const crc = crc32(content);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, DOS_TIME);
    writeUint16(localHeader, 12, DOS_DATE);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, content.length);
    writeUint32(localHeader, 22, content.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    fileEntries.push(localHeader, content);

    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 8, 0);
    writeUint16(central, 10, 0);
    writeUint16(central, 12, DOS_TIME);
    writeUint16(central, 14, DOS_DATE);
    writeUint32(central, 16, crc);
    writeUint32(central, 20, content.length);
    writeUint32(central, 24, content.length);
    writeUint16(central, 28, nameBytes.length);
    writeUint16(central, 30, 0);
    writeUint16(central, 32, 0);
    writeUint16(central, 34, 0);
    writeUint16(central, 36, 0);
    writeUint32(central, 38, 0);
    writeUint32(central, 42, offset);
    central.set(nameBytes, 46);

    centralEntries.push({ central, size: central.length });
    offset += localHeader.length + content.length;
  });

  const centralSize = centralEntries.reduce((s, e) => s + e.size, 0);
  const centralOffset = offset;

  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 4, 0);
  writeUint16(end, 6, 0);
  writeUint16(end, 8, Object.keys(fileMap).length);
  writeUint16(end, 10, Object.keys(fileMap).length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, centralOffset);
  writeUint16(end, 20, 0);

  const totalSize = offset + centralSize + end.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  fileEntries.forEach((u8) => {
    out.set(u8, pos);
    pos += u8.length;
  });
  centralEntries.forEach(({ central }) => {
    out.set(central, pos);
    pos += central.length;
  });
  out.set(end, pos);

  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function writeUint16(arr, pos, val) {
  arr[pos] = val & 0xff;
  arr[pos + 1] = (val >>> 8) & 0xff;
}
function writeUint32(arr, pos, val) {
  arr[pos] = val & 0xff;
  arr[pos + 1] = (val >>> 8) & 0xff;
  arr[pos + 2] = (val >>> 16) & 0xff;
  arr[pos + 3] = (val >>> 24) & 0xff;
}
function crc32(bytes) {
  let c = -1;
  for (let i = 0; i < bytes.length; i++) {
    c = (c >>> 8) ^ table[(c ^ bytes[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}
const table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function dataUrlToBytes(dataUrl) {
  const [head, b64] = String(dataUrl).split(',');
  const match = head.match(/data:([^;]+);base64/);
  const mime = (match && match[1]) || 'image/png';
  const ext = mime.split('/')[1] || 'png';
  const bin = atob(b64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, ext, mime };
}

function inlineImageXml(relId, widthPx, heightPx) {
  const cx = Math.round(widthPx * 9525);
  const cy = Math.round(heightPx * 9525);
  return `
<w:p>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${cx}" cy="${cy}"/>
        <wp:docPr id="1" name="Picture"/>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/officeDocument/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="image"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`.trim();
}
