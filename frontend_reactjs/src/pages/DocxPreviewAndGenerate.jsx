import React, { useMemo, useCallback } from "react";
import { computeOverlaysFromFields, buildDocxWithBackgroundAndOverlays, zipSync as zipPreviewZip, makeTranscriptPreviewHtml } from "../services/docxTemplateService";
import { loadTemplateTranscript, interpolateTranscriptStrict, generateDocxFromTranscriptLines, zipSync as zipExactZip, mapUserDataForTemplateStrict } from "../services/strictDocxTemplateMergeService";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Shows the original DOCX transcript in a faux page, overlays current values in-place,
 * and generates a .docx that preserves layout with the template unchanged except for filled values.
 *
 * Props:
 * - transcriptText: string (DOCX text content from selected template)
 * - templateSchema: runtime schema with fields[]
 * - data: SOW data containing meta (logo) and templateData values
 */
export default function DocxPreviewAndGenerate({ transcriptText, templateSchema, data }) {
  const previewHtml = useMemo(() => makeTranscriptPreviewHtml(transcriptText || ""), [transcriptText]);

  const overlays = useMemo(() => {
    // compute overlays from schema fields and substitute user values for preview and export
    const base = computeOverlaysFromFields((templateSchema && templateSchema.fields) ? templateSchema.fields : []);
    return base.map((ov) => {
      const v = getPath(data?.templateData || {}, ov.fieldKey);
      return {
        ...ov,
        text: labelFromSchemaKey(templateSchema?.fields || [], ov.fieldKey) + ": " + formatValue(v),
      };
    });
  }, [templateSchema, data]);

  function labelFromSchemaKey(fields, key) {
    const found = (fields || []).find((f) => f.key === key);
    return found?.label || key;
  }

  function formatValue(v) {
    if (v == null) return "";
    if (Array.isArray(v)) {
      return v.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
    }
    if (typeof v === "object") {
      try {
        return Object.keys(v).map((k) => `${k}: ${formatValue(v[k])}`).join("; ");
      } catch {
        return JSON.stringify(v);
      }
    }
    return String(v);
  }

  // Generate using preview overlays (legacy visual approximation, kept for on-screen preview)
  function onGeneratePreviewOverlay() {
    const pages = [{ widthPx: 794, heightPx: 1123 }];
    const files = buildDocxWithBackgroundAndOverlays({
      pages,
      overlays,
      logoDataUrl: data?.meta?.logoUrl || ""
    });
    const blob = zipPreviewZip(files);
    const name = `SOW_${(data?.meta?.client || "Client").replace(/[^\w-]+/g, "_")}_${(data?.meta?.title || "Project").replace(/[^\w-]+/g, "_")}.docx`;
    triggerDownload(blob, name);
  }

  // Generate using the actual DOCX as base via docxtemplater (pixel-perfect)
  const onGenerateExact = useCallback(async () => {
    try {
      // Determine which DOCX to load (FP/TM or provided URL)
      const tt = detectTemplateType(templateSchema);
      const { getLatestTemplateAttachmentPaths } = await import("../services/exactTemplateExportService.js");
      const { loadDocxArrayBuffer, prepareTemplateData, mergeDocxWithData } = await import("../services/docxInPlaceTemplateMergeService.js");

      // In our current setup, attachments folder contains .txt (transcripts). For pixel-perfect, we require the actual .docx.
      // If your UI uploads/holds a docx URL in data.meta.templateDocxUrl, prefer that. Otherwise, we cannot fetch a .docx from transcript,
      // so this path expects data.meta.templateDocxUrl to be present.
      const templateDocxUrl = data?.meta?.templateDocxUrl || null;
      if (!templateDocxUrl) {
        alert("No DOCX template file available. Please upload or provide meta.templateDocxUrl to export the exact template.");
        return;
      }

      const ab = await loadDocxArrayBuffer(templateDocxUrl);

      // Prepare data map for tags (only matching tags are replaced)
      const dataMap = prepareTemplateData(data?.templateData || {});
      const blob = mergeDocxWithData(ab, dataMap, { keepUnfilledTags: true });

      const name = `SOW_${(data?.meta?.client || "Client").replace(/[^\w-]+/g, "_")}_${(data?.meta?.title || "Project").replace(/[^\w-]+/g, "_")}.docx`;
      triggerDownload(blob, name);
    } catch (e) {
      alert(`Failed to generate DOCX from exact template: ${e?.message || e}`);
    }
  }, [templateSchema, data]);

  function triggerDownload(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    requestAnimationFrame(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    });
  }

  function detectTemplateType(schema) {
    const id = (schema && schema.id) || "";
    const title = (schema && schema.title) || "";
    const t = `${id} ${title}`.toLowerCase();
    if (t.includes("fixed")) return "FP";
    if (t.includes("t&m") || t.includes("time") || t.includes("tm")) return "TM";
    return null;
  }

  return (
    <div className="panel">
      <div className="panel-title">Preview & Generate (DOCX)</div>
      <div style={{ display: "grid", placeItems: "center", padding: 8 }}>
        <div
          style={{
            position: "relative",
            background: "#fff",
            color: "#111",
            width: "min(820px, 96%)",
            border: "1px solid #ddd",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            borderRadius: 4,
            padding: "28px 36px",
            overflow: "auto",
            maxHeight: 600,
          }}
        >
          {/* Top-left logo overlay */}
          {data?.meta?.logoUrl ? (
            <img
              alt="Logo"
              src={data.meta.logoUrl}
              style={{ position: "absolute", left: 8, top: 8, maxHeight: 56, background: "transparent" }}
            />
          ) : null}

          {/* Original transcript shown verbatim */}
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />

          {/* Simple positioned overlays (heuristic vertical stacking) */}
          <div aria-hidden style={{ position: "relative", marginTop: 8 }}>
            {(overlays || []).map((ov, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  left: ov.xPx,
                  top: ov.yPx,
                  color: "#111",
                  fontWeight: 500,
                  marginBottom: 2
                }}
                title={ov.fieldKey}
              >
                {ov.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button className="btn btn-primary" type="button" onClick={onGenerateExact}>Generate DOCX (Exact Template)</button>
        <button className="btn" type="button" onClick={onGeneratePreviewOverlay} title="Optional, for visual approximation preview only">Generate DOCX (Preview Overlay)</button>
        <div style={{ color: "var(--text-secondary)" }}>
          The Exact Template option uses ONLY the provided template and replaces placeholders in-place.
        </div>
      </div>
    </div>
  );
}

function getPath(obj, keyOrPath) {
  if (!obj) return undefined;
  if (!keyOrPath) return undefined;
  const s = String(keyOrPath);
  if (s.includes(".")) {
    return s.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  }
  return obj[s];
}
