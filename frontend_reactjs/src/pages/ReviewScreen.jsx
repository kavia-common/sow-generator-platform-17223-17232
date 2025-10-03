import React, { useMemo } from "react";
import { makeTranscriptPreviewHtml } from "../services/docxTemplateService";
import ReviewTable from "../components/ReviewTable";

/**
 * PUBLIC_INTERFACE
 * ReviewScreen
 * Renders a unified, tabular preview of all captured SOW fields in the same visual order
 * as the chosen template. Each field appears once, with placeholders for empties and
 * multi-line/list formatting. The transcript preview remains above for context.
 */
export default function ReviewScreen({ data, templateSchema, transcriptText, onEdit, onConfirm }) {
  const previewHtml = useMemo(() => makeTranscriptPreviewHtml(transcriptText || ""), [transcriptText]);

  // Expand sectioned schema to ordered flat rows, preserving section order and object subfield order.
  const orderedRows = useMemo(() => {
    if (!templateSchema) return [];
    const out = [];
    const td = data?.templateData || {};

    const pushField = (key, label) => {
      out.push({
        key,
        label: label || key,
        value: getByPath(td, key),
      });
    };

    if (Array.isArray(templateSchema.sections)) {
      (templateSchema.sections || []).forEach((sec) => {
        (sec.fields || []).forEach((f) => {
          if (f.type === "object" && Array.isArray(f.properties)) {
            f.properties.forEach((p) => {
              pushField(`${f.key}.${p.key}`, `${f.label} — ${p.label}`);
            });
          } else {
            pushField(f.key, f.label || f.key);
          }
        });
      });
    } else if (Array.isArray(templateSchema.fields)) {
      (templateSchema.fields || []).forEach((f) => {
        pushField(f.key, f.label || f.key);
      });
    }

    // Deduplicate by key in case upstream provided both object-flattened and flat forms.
    const seen = new Set();
    return out.filter((r) => {
      if (seen.has(r.key)) return false;
      seen.add(r.key);
      return true;
    });
  }, [templateSchema, data]);

  return (
    <div className="panel">
      <div className="panel-title">Review Your SOW</div>

      <div style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
        Please review your entries in the table below before generating the Word document.
      </div>

      <div style={{ display: "grid", placeItems: "center", padding: 8 }}>
        <div
          style={{
            position: "relative",
            background: "#fff",
            color: "#111",
            width: "min(920px, 96%)",
            border: "1px solid #ddd",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            borderRadius: 8,
            padding: "24px 28px",
            overflow: "auto",
            maxHeight: 650
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

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: "#111" }}>Your Entries (Preview)</div>
            <ReviewTable rows={orderedRows} />
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

// PUBLIC_INTERFACE
export function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  if (String(path).includes(".")) {
    const val = String(path).split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
    if (val !== undefined) return val;
  }
  return obj[path];
}
