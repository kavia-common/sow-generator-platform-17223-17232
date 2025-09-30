import React, { useMemo } from "react";
import { computeOverlaysFromFields, buildDocxWithBackgroundAndOverlays, zipSync, makeTranscriptPreviewHtml } from "../services/docxTemplateService";

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
    const base = computeOverlaysFromFields(templateSchema?.fields || []);
    return base.map((ov) => {
      const v = getPath(data?.templateData || {}, [ov.fieldKey]);
      return {
        ...ov,
        text: labelFromSchemaKey(templateSchema?.fields || [], ov.fieldKey) + ": " + (formatValue(v)),
      };
    });
  }, [templateSchema, data]);

  function labelFromSchemaKey(fields, key) {
    const found = (fields || []).find((f) => f.key === key);
    return found?.label || key;
  }

  function formatValue(v) {
    if (Array.isArray(v)) return v.join(", ");
    if (v && typeof v === "object") return JSON.stringify(v);
    return v ?? "";
    }

  function onGenerate() {
    // Single page dimensions (approx) for A4-like preview
    const pages = [{ widthPx: 794, heightPx: 1123 }];
    const files = buildDocxWithBackgroundAndOverlays({
      pages,
      overlays,
      logoDataUrl: data?.meta?.logoUrl || ""
    });
    const blob = zipSync(files);
    const name = `SOW_${(data?.meta?.client || "Client").replace(/[^\w-]+/g, "_")}_${(data?.meta?.title || "Project").replace(/[^\w-]+/g, "_")}.docx`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    requestAnimationFrame(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    });
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

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary" type="button" onClick={onGenerate}>Generate DOCX</button>
        <div style={{ color: "var(--text-secondary)" }}>
          This will merge your entries into the original template layout. Only .docx output is produced; no PDF or draft output.
        </div>
      </div>
    </div>
  );
}

function getPath(obj, path) {
  return (path || "").split(".").reduce((o, k) => (o ? o[k] : undefined), obj || {});
}
