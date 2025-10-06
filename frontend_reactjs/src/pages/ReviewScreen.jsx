import React, { useMemo } from "react";
import { makeTranscriptPreviewHtml } from "../services/docxTemplateService";
import { normalizeLabel, shouldExcludeFromAllEnteredFields } from "../services/labelUtils.js";

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
    const { normalizeLabel, shouldExcludeFromAllEnteredFields } = require("../services/labelUtils.js");

    const filtered = (normalizedFields || []).filter((f) => {
      const lblNorm = normalizeLabel(f.label || f.key || "");
      const lblLower = String(lblNorm || "").toLowerCase().trim();
      if (shouldExcludeFromAllEnteredFields(lblLower)) return false;
      // additionally exclude any key that clearly belongs to signatures
      if (String(f.key || "").toLowerCase().includes("signature")) return false;
      return true;
    });

    return filtered.map((f) => {
      const shortLabel = normalizeLabel(f.label || f.key);
      const rawVal = resolveValueByKey(templateData, f.key);
      return { key: f.key, label: shortLabel, value: formatValue(rawVal) };
    });
  }, [normalizedFields, data]);

  // Pull preamble values from stored state
  const preStart = data?.preamble?.startDate || "";
  const preEnd = data?.preamble?.endDate || "";
  const preSupplier = data?.preamble?.supplier || "";
  const preRange = preStart || preEnd ? `[${preStart}${preStart && preEnd ? " - " : ""}${preEnd}]` : "[startdate - enddate]";
  const preSupplierText = preSupplier ? `[${preSupplier}]` : "[supplier]";

  return (
    <div className="panel">
      <div className="panel-title">Review Your SOW</div>

      <div style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
        Please review your entries as they will appear in the final document. Use Edit to make corrections. Click Confirm to generate the DOCX.
      </div>

      {/* Preamble context */}
      <div className="panel" style={{ marginBottom: 8 }}>
        <div className="panel-title">Preamble</div>
        <div style={{ color: "#111" }}>
          The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between {preRange}, and {preSupplierText} (the “Supplier”), as amended from time to time (the “Agreement”). Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", rowGap: 6, columnGap: 8, marginTop: 8 }}>
          <div style={{ color: "#444" }}>Start Date</div><div>{preStart || "—"}</div>
          <div style={{ color: "#444" }}>End Date</div><div>{preEnd || "—"}</div>
          <div style={{ color: "#444" }}>Supplier</div><div>{preSupplier || "—"}</div>
        </div>
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

          {/* All Entered Fields: filtered to exclude start/end/supplier and any signatures */}
          <div style={{ borderTop: "1px solid #eee", marginTop: 12, paddingTop: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>All Entered Fields</div>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", rowGap: 6, columnGap: 8 }}>
              {(kvList || []).map((row, i) => (
                <React.Fragment key={i}>
                  <div style={{ color: "#444" }}>{row.label}</div>
                  <div style={{ color: "#111" }}>
                    {row.value || "—"}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Authorized Signatures - dedicated end section */}
          <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Authorized Signatures</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Supplier</div>
                {(() => {
                  const sig = data?.templateData?.authorization_signatures?.supplier_signature || data?.templateData?.supplier_signature;
                  const name = data?.templateData?.authorization_signatures?.supplier_signature_name || data?.templateData?.supplier_signature_name || data?.templateData?.supplier_signer_name;
                  const title = data?.templateData?.authorization_signatures?.supplier_signature_title || data?.templateData?.supplier_signature_title || data?.templateData?.supplier_signer_title;
                  const date = data?.templateData?.authorization_signatures?.supplier_signature_date || data?.templateData?.supplier_signature_date || data?.templateData?.supplier_sign_date;
                  return (
                    <>
                      {sig && typeof sig === "string" && /^data:image\//.test(sig) ? (
                        <img alt="Supplier Signature" src={sig} style={{ maxHeight: 80 }} />
                      ) : <div style={{ height: 24 }} />}
                      <div><strong>Supplier:</strong> {data?.templateData?.supplier_name || data?.templateData?.supplier_company_name || "—"}</div>
                      <div><strong>Name:</strong> {name || "—"}</div>
                      <div><strong>Title:</strong> {title || "—"}</div>
                      <div><strong>Date:</strong> {date || "—"}</div>
                    </>
                  );
                })()}
              </div>
              <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Client</div>
                {(() => {
                  const sig = data?.templateData?.authorization_signatures?.client_signature || data?.templateData?.client_signature || data?.templateData?.company_signature;
                  const companyName = data?.templateData?.client_company_name_signature_block || data?.templateData?.client_company_name || data?.templateData?.client_name || data?.meta?.client;
                  const name = data?.templateData?.authorization_signatures?.client_signature_name || data?.templateData?.client_signature_name || data?.templateData?.company_signer_name;
                  const title = data?.templateData?.authorization_signatures?.client_signature_title || data?.templateData?.client_signature_title || data?.templateData?.company_signer_title;
                  const date = data?.templateData?.authorization_signatures?.client_signature_date || data?.templateData?.client_signature_date || data?.templateData?.company_sign_date;
                  return (
                    <>
                      {sig && typeof sig === "string" && /^data:image\//.test(sig) ? (
                        <img alt="Client Signature" src={sig} style={{ maxHeight: 80 }} />
                      ) : <div style={{ height: 24 }} />}
                      <div><strong>Company:</strong> {companyName || "—"}</div>
                      <div><strong>Name:</strong> {name || "—"}</div>
                      <div><strong>Title:</strong> {title || "—"}</div>
                      <div><strong>Date:</strong> {date || "—"}</div>
                    </>
                  );
                })()}
              </div>
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
