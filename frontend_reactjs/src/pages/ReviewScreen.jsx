import React, { useMemo } from "react";
import { makeTranscriptPreviewHtml } from "../services/docxTemplateService";

/**
 * PUBLIC_INTERFACE
 * ReviewScreen
 * Ensures the review renders overlays strictly derived from the selected template's schema.
 * Accepts either a flat schema ({ fields: [...] }) or a sectioned schema ({ sections: [...] }).
 */
export default function ReviewScreen({ data, templateSchema, transcriptText, onEdit, onConfirm }) {
  /** This screen shows the selected template transcript and overlays each captured field inline with a logo. */
  const previewHtml = useMemo(() => makeTranscriptPreviewHtml(transcriptText || ""), [transcriptText]);

  // Normalize schema to a flat field list based on the provided templateSchema format.
  const normalizedFields = useMemo(() => {
    if (!templateSchema) return [];
    // If schema has sections (from parsed transcript), flatten those fields preserving keys/labels/types
    if (Array.isArray(templateSchema.sections)) {
      const fields = [];
      (templateSchema.sections || []).forEach((sec) => {
        (sec.fields || []).forEach((f) => {
          // Support object groups by lifting properties with composite keys "group.prop"
          if (f.type === "object" && Array.isArray(f.properties)) {
            f.properties.forEach((p) => {
              fields.push({ key: `${f.key}.${p.key}`, label: `${f.label} — ${p.label}`, type: p.type });
            });
          } else {
            fields.push({ key: f.key, label: f.label || f.key, type: f.type });
          }
        });
      });
      return fields;
    }
    // Else assume flat schema { fields: [...] }
    return templateSchema.fields || [];
  }, [templateSchema]);

  // Build a simple key:value list for quick review to keep UX simple and free of overlays/prompts.
  const kvList = useMemo(() => {
    const templateData = data?.templateData || {};
    return (normalizedFields || []).map((f) => {
      const rawVal = resolveValueByKey(templateData, f.key);
      return { key: f.key, label: f.label || f.key, value: formatValue(rawVal) };
    });
  }, [normalizedFields, data]);

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

          <div style={{ borderTop: "1px solid #eee", marginTop: 12, paddingTop: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Your Entries</div>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", rowGap: 6, columnGap: 8 }}>
              {(kvList || []).map((row, i) => (
                <React.Fragment key={i}>
                  <div style={{ color: "#444" }}>{row.label}</div>
                  <div style={{ color: "#111" }}>{row.value || "—"}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn" type="button" onClick={onEdit}>Edit</button>
        <button className="btn btn-primary" type="button" onClick={onConfirm}>Confirm and Generate DOCX</button>
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
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
  }
  if (typeof v === "object") {
    // For objects, render key: value pairs compactly
    try {
      return Object.keys(v).map((k) => `${k}: ${formatValue(v[k])}`).join("; ");
    } catch {
      return JSON.stringify(v);
    }
  }
  return String(v);
}
/**
 * Resolve value by key supporting dotted paths ("a.b") and flat keys ("a_b") fallbacks.
 */
function resolveValueByKey(obj, key) {
  if (!obj) return undefined;
  if (!key) return undefined;
  if (String(key).includes(".")) {
    const val = String(key)
      .split(".")
      .reduce((o, k) => (o ? o[k] : undefined), obj);
    if (val !== undefined) return val;
  }
  return obj[key];
}
