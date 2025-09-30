import React, { useMemo } from "react";
import { makeTranscriptPreviewHtml, computeOverlaysFromFields } from "../services/docxTemplateService";

// PUBLIC_INTERFACE
export default function ReviewScreen({ data, templateSchema, transcriptText, onEdit, onConfirm }) {
  /** This screen shows the template text and overlays each captured field value inline, with a logo at the top-left. */
  const previewHtml = useMemo(() => makeTranscriptPreviewHtml(transcriptText || ""), [transcriptText]);

  const overlays = useMemo(() => {
    const fields = templateSchema?.fields || [];
    const base = computeOverlaysFromFields(fields);
    return base.map((ov) => {
      const val = getPath(data?.templateData || {}, ov.fieldKey);
      return {
        ...ov,
        text: `${labelFor(fields, ov.fieldKey)}: ${formatValue(val)}`
      };
    });
  }, [templateSchema, data]);

  return (
    <div className="panel">
      <div className="panel-title">Review Your SOW</div>

      <div style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
        Please review your entries as they will appear in the final document. Use Edit to make corrections. Click Confirm to generate the DOCX.
      </div>

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
            maxHeight: 600
          }}
        >
          {data?.meta?.logoUrl ? (
            <img
              alt="Logo"
              src={data.meta.logoUrl}
              style={{ position: "absolute", left: 8, top: 8, maxHeight: 56, background: "transparent" }}
            />
          ) : null}

          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />

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
        <button className="btn" type="button" onClick={onEdit}>Edit</button>
        <button className="btn btn-primary" type="button" onClick={onConfirm}>Confirm and Continue to DOCX Preview</button>
      </div>
    </div>
  );
}

// Helpers
function labelFor(fields, key) {
  const found = (fields || []).find((f) => f.key === key);
  return found?.label || key;
}
function formatValue(v) {
  if (Array.isArray(v)) return v.join(", ");
  if (v && typeof v === "object") return JSON.stringify(v);
  return v ?? "";
}
function getPath(obj, key) {
  // Here keys are flat (no dot path) for templateData; nested object fields are rendered as objects already
  return (obj || {})[key];
}
