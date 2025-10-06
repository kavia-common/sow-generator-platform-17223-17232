import React, { useMemo } from "react";
import "../theme.css";
import "../styles.css";
import DocxPreviewAndGenerate from "./DocxPreviewAndGenerate";
import { makeTranscriptPreviewHtml } from "../services/docxTemplateService";
import ReviewTable from "../components/ReviewTable.jsx";

/**
 * PUBLIC_INTERFACE
 * ReviewScreen
 * Renders the read-only preview and appends a final "Authorized Signatures" section.
 * Also shows a clearly visible pink "Generate DOCX" button which triggers generation only on click.
 *
 * Props:
 * - transcriptText?: string      // existing HTML transcript-like content for preview
 * - data?: object                // full SOW data object { meta?, templateData?, templateMeta? }
 * - templateSchema?: object      // schema used for building DOCX (for All Entered Fields enumeration)
 */
export default function ReviewScreen({ transcriptText, data, templateSchema }) {
  const previewHtml = useMemo(
    () => makeTranscriptPreviewHtml(transcriptText || ""),
    [transcriptText]
  );

  // Extract signature info from provided data with resilient fallbacks
  const td = data?.templateData || {};
  const sig = td.authorization_signatures || td.signature || td.signer || {};
  const company =
    sig.company ||
    td.client_company_name_signature_block ||
    td.client_company_name ||
    td.company_name ||
    data?.meta?.client ||
    "";
  const name =
    sig.name ||
    td.client_signature_name ||
    td.company_signer_name ||
    td.supplier_signature_name ||
    "";
  const date =
    sig.date ||
    td.client_signature_date ||
    td.company_sign_date ||
    td.supplier_signature_date ||
    "";
  const image =
    sig.client_signature ||
    sig.supplier_signature ||
    sig.image ||
    sig.url ||
    data?.meta?.signaturePreview?.client_signature ||
    data?.meta?.signaturePreview?.supplier_signature ||
    "";

  return (
    <div className="preview review-surface" style={{ padding: 16 }}>
      {/* Existing transcript-based preview */}
      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />

      {/* All Entered Fields: Custom Fields */}
      {Array.isArray(td?.customFields) && td.customFields.length > 0 && (
        <section style={{ marginTop: 16 }}>
          {/* Title is kept concise; any descriptive paragraph above the table has been removed */}
          <h2 style={{ margin: "6px 0 10px" }}>Additional Fields</h2>
          <ReviewTable
            rows={td.customFields.map((it, idx) => ({
              key: `cf-${idx}`,
              label: it?.label || "",
              value: it?.value ?? "",
            }))}
          />
        </section>
      )}

      {/* Authorized Signatures section appended at the very end */}
      <section
        aria-label="Authorized Signatures"
        style={{
          marginTop: 16,
          borderTop: "1px solid var(--color-border)",
          paddingTop: 12,
        }}
      >
        <h2 style={{ margin: "6px 0 10px" }}>Authorized Signatures</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>
              Company
            </div>
            <div>{company || "—"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>
              Name
            </div>
            <div>{name || "—"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>
              Date
            </div>
            <div>{date || "—"}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Signature
            </div>
            {image ? (
              <img
                src={image}
                alt="Authorized signature"
                style={{
                  maxHeight: 128,
                  maxWidth: "100%",
                  objectFit: "contain",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: 8,
                }}
                onError={(e) => {
                  // Hide gracefully if image fails to load
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="text-muted" style={{ fontStyle: "italic" }}>
                No signature image provided
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pink Generate DOCX button area (click only; no auto-trigger) */}
      <div className="panel" style={{ marginTop: 16 }}>
        <DocxPreviewAndGenerate data={data} templateSchema={templateSchema} />
      </div>
    </div>
  );
}
