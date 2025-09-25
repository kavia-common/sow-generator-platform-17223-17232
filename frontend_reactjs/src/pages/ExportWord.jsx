import React from "react";

/**
 * PUBLIC_INTERFACE
 * ExportWord
 * Builds a minimal .docx (Word) file client-side following the extracted SOW template structure.
 * No external libraries; constructs a simple DOCX with a document.xml packed into a ZIP container.
 * Note: This is a simplified .docx generator sufficient for headings, paragraphs, and bullet lists.
 */
export default function ExportWord({ value, meta }) {
  const makeParagraph = (text) =>
    `<w:p><w:r><w:t>${escapeXml(text || "")}</w:t></w:r></w:p>`;

  const makeHeading = (text, level = 1) =>
    `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr><w:r><w:t>${escapeXml(
      text || ""
    )}</w:t></w:r></w:p>`;

  const makeList = (items = []) =>
    items
      .map(
        (t) =>
          `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${escapeXml(
            String(t || "")
          )}</w:t></w:r></w:p>`
      )
      .join("");

  const downloadDocx = () => {
    try {
      const docTitle =
        meta?.title || value?.meta?.title || "Statement of Work";
      const filename = `SOW_${(meta?.client || "Client")
        .replace(/[^\\w-]+/g, "_")}_${(docTitle || "Project")
        .replace(/[^\\w-]+/g, "_")}_${(meta?.date || new Date()
        .toISOString()
        .slice(0, 10))}.docx`;

      const xml = buildDocumentXml(value, meta);

      // Build a minimal DOCX package (ZIP with specific files)
      const files = buildDocxFiles(xml);
      const blob = zipSync(files);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      requestAnimationFrame(() => {
        URL.revokeObjectURL(link.href);
        link.remove();
      });
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Failed to export Word: ${e?.message || e}`);
    }
  };

  function buildDocumentXml(data, metaInfo) {
    const d = data || {};
    const metaSec = d.meta || {};
    const bg = d.background || {};
    const scope = d.scope || {};
    const deliv = d.deliverables || {};
    const roles = d.roles || {};
    const app = d.approach || {};
    const gov = d.governance || {};
    const comm = d.commercials || {};
    const legal = d.legal || {};
    const sign = d.signoff || {};

    const title = metaInfo?.title || metaSec.title || "Statement of Work";
    const header = [
      makeHeading(title, 1),
      makeParagraph(`Client/Organization: ${metaSec.client || ""}`),
      makeParagraph(`Date: ${metaSec.date || metaInfo?.date || ""}`),
      makeParagraph(`Version: ${metaSec.version || ""}`),
      makeParagraph(`Prepared By: ${metaSec.prepared_by || ""}`),
      makeParagraph(
        `Stakeholders/Approvers: ${(metaSec.stakeholders || []).join(", ")}`
      ),
    ].join("");

    const background = [
      makeHeading("Background & Objectives", 2),
      makeParagraph(`Project Background: ${bg.project_background || ""}`),
      makeParagraph(`Business Problem: ${bg.business_problem || ""}`),
      makeParagraph(`Objectives/Goals: ${bg.objectives || ""}`),
      makeParagraph(`Success Criteria / KPIs: ${bg.success_criteria || ""}`),
    ].join("");

    const scopeXml = [
      makeHeading("Scope", 2),
      makeParagraph("In-Scope Items"),
      makeList(scope.in_scope || []),
      makeParagraph("Out-of-Scope Items"),
      makeList(scope.out_of_scope || []),
      makeParagraph("Assumptions"),
      makeList(scope.assumptions || []),
      makeParagraph("Constraints"),
      makeList(scope.constraints || []),
      makeParagraph("Dependencies"),
      makeList(scope.dependencies || []),
    ].join("");

    const delivXml = [
      makeHeading("Deliverables & Schedule", 2),
      makeParagraph("Deliverables"),
      makeList(deliv.items || []),
      makeParagraph("Milestones"),
      makeList(deliv.milestones || []),
      makeParagraph("Timeline / Schedule"),
      makeList(deliv.timeline || []),
      makeParagraph("Acceptance Criteria"),
      makeParagraph(deliv.acceptance_criteria || ""),
    ].join("");

    const rolesXml = [
      makeHeading("Roles & Responsibilities", 2),
      makeParagraph(`Project Sponsor: ${roles.sponsor || ""}`),
      makeParagraph(`Project Manager: ${roles.pm || ""}`),
      makeParagraph(`Technical Lead: ${roles.tech_lead || ""}`),
      makeParagraph(
        `Team Members / Roles: ${(roles.team || []).join(", ")}`
      ),
      makeParagraph(
        `Client Responsibilities: ${roles.client_responsibilities || ""}`
      ),
    ].join("");

    const approachXml = [
      makeHeading("Approach & Methodology", 2),
      makeParagraph(`Solution Overview: ${app.solution_overview || ""}`),
      makeParagraph(
        `Technical Stack / Tools: ${(app.tech_stack || []).join(", ")}`
      ),
      makeParagraph(
        `Data Sources / Integrations: ${(app.data_sources || []).join(", ")}`
      ),
      makeParagraph(`Security & Compliance: ${app.security || ""}`),
      makeParagraph(`QA & Testing Strategy: ${app.qa_strategy || ""}`),
    ].join("");

    const govXml = [
      makeHeading("Governance & Communication", 2),
      makeParagraph(`Communication Plan: ${gov.comm_plan || ""}`),
      makeParagraph(`Status Reporting Cadence: ${gov.reporting || ""}`),
      makeParagraph(`Meeting Schedule: ${gov.meetings || ""}`),
      makeParagraph(`Risk Management Plan: ${gov.risk_mgmt || ""}`),
      makeParagraph(`Change Control Process: ${gov.change_control || ""}`),
    ].join("");

    const commXml = [
      makeHeading("Commercials", 2),
      makeParagraph(`Pricing Model: ${comm.pricing_model || ""}`),
      makeParagraph(`Estimated Cost / Budget: ${comm.budget || ""}`),
      makeParagraph(`Payment Terms: ${comm.payment_terms || ""}`),
      makeParagraph(`Invoicing Schedule: ${comm.invoicing || ""}`),
    ].join("");

    const legalXml = [
      makeHeading("Legal & Terms", 2),
      makeParagraph(`Confidentiality: ${legal.confidentiality || ""}`),
      makeParagraph(`IP Ownership: ${legal.ip || ""}`),
      makeParagraph(`Service Level Agreements (SLA): ${legal.sla || ""}`),
      makeParagraph(`Termination: ${legal.termination || ""}`),
      makeParagraph(`Warranties & Liabilities: ${legal.warranties || ""}`),
    ].join("");

    const signXml = [
      makeHeading("Sign-off", 2),
      makeParagraph(`Signatories: ${(sign.signatories || []).join(", ")}`),
      makeParagraph(`Sign-off Date: ${sign.date || ""}`),
    ].join("");

    const body = [header, background, scopeXml, delivXml, rolesXml, approachXml, govXml, commXml, legalXml, signXml].join("");

    // Minimal document XML with numbering definitions for bullets
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  }

  function escapeXml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Build the minimal set of files required for a docx
  function buildDocxFiles(documentXml) {
    const files = {};
    files["[Content_Types].xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

    files["_rels/.rels"] = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    files["word/_rels/document.xml.rels"] = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

    files["word/document.xml"] = documentXml;

    files["word/styles.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="480" w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="360" w:after="180"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
</w:styles>`;

    // numbering.xml to support simple bullet list (numId 1)
    files["word/numbering.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
</w:numbering>`;

    return files;
  }

  // Create a very small ZIP writer (no compression) for docx
  function zipSync(fileMap) {
    const encoder = new TextEncoder();
    const fileEntries = [];
    const centralEntries = [];
    let offset = 0;

    const DOS_TIME = 0; // minimal
    const DOS_DATE = 0;

    Object.keys(fileMap).forEach((filename) => {
      const content = encoder.encode(fileMap[filename]);
      const nameBytes = encoder.encode(filename);
      const crc = crc32(content);

      // Local file header
      const localHeader = new Uint8Array(30 + nameBytes.length);
      writeUint32(localHeader, 0, 0x04034b50); // local file header signature
      writeUint16(localHeader, 4, 20); // version needed
      writeUint16(localHeader, 6, 0); // flags
      writeUint16(localHeader, 8, 0); // compression 0 = store
      writeUint16(localHeader, 10, DOS_TIME);
      writeUint16(localHeader, 12, DOS_DATE);
      writeUint32(localHeader, 14, crc);
      writeUint32(localHeader, 18, content.length);
      writeUint32(localHeader, 22, content.length);
      writeUint16(localHeader, 26, nameBytes.length);
      writeUint16(localHeader, 28, 0); // extra length
      localHeader.set(nameBytes, 30);

      fileEntries.push(localHeader, content);

      // Central directory header
      const central = new Uint8Array(46 + nameBytes.length);
      writeUint32(central, 0, 0x02014b50);
      writeUint16(central, 4, 20); // version made by
      writeUint16(central, 6, 20); // version needed
      writeUint16(central, 8, 0); // flags
      writeUint16(central, 10, 0); // compression
      writeUint16(central, 12, DOS_TIME);
      writeUint16(central, 14, DOS_DATE);
      writeUint32(central, 16, crc);
      writeUint32(central, 20, content.length);
      writeUint32(central, 24, content.length);
      writeUint16(central, 28, nameBytes.length);
      writeUint16(central, 30, 0); // extra
      writeUint16(central, 32, 0); // comment
      writeUint16(central, 34, 0); // disk number
      writeUint16(central, 36, 0); // internal attrs
      writeUint32(central, 38, 0); // external attrs
      writeUint32(central, 42, offset); // relative offset of local header
      central.set(nameBytes, 46);

      centralEntries.push({ central, size: central.length });
      offset += localHeader.length + content.length;
    });

    const centralSize = centralEntries.reduce((s, e) => s + e.size, 0);
    const centralOffset = offset;

    const end = new Uint8Array(22);
    writeUint32(end, 0, 0x06054b50);
    writeUint16(end, 4, 0); // disk
    writeUint16(end, 6, 0); // disk start
    writeUint16(end, 8, Object.keys(fileMap).length);
    writeUint16(end, 10, Object.keys(fileMap).length);
    writeUint32(end, 12, centralSize);
    writeUint32(end, 16, centralOffset);
    writeUint16(end, 20, 0); // comment length

    const totalSize =
      offset + centralSize + end.length;
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

    return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
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

  // CRC32 implementation
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
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[i] = c >>> 0;
    }
    return t;
  })();

  return (
    <div className="panel">
      <div className="panel-title">Export</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button className="btn btn-primary" type="button" onClick={downloadDocx}>Export Word (.docx)</button>
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        Exports a structured Word document following the SOW template (headings, paragraphs, and bullet lists).
      </div>
    </div>
  );
}
