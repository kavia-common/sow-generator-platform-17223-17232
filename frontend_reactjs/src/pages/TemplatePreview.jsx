import React, { useEffect, useMemo, useState } from "react";
import { buildDynamicTemplateSchemaFromTranscript, makeTranscriptPreviewHtml } from "../services/docxTemplateService";

/**
 * PUBLIC_INTERFACE
 * TemplatePreview
 * Loads and previews SOW DOCX transcript templates (FP and T&M), allows selection.
 * Shows original template text (from .docx transcript) only—no HTML templates—plus top-left logo overlay handled later.
 * Parsing is used only to detect dynamic fields for the SOW form.
 */
export default function TemplatePreview({ selected, onSelect }) {
  const [fpText, setFpText] = useState("");
  const [tmText, setTmText] = useState("");
  const [tab, setTab] = useState(selected === "FP" ? "FP" : selected === "TM" ? "TM" : "FP");
  const [schemas, setSchemas] = useState({ FP: null, TM: null });

  useEffect(() => {
    async function loadLatest() {
      const { getLatestTemplateAttachmentPaths } = await import("../services/exactTemplateExportService.js");
      const paths = getLatestTemplateAttachmentPaths();

      // Extend with the explicitly provided latest attachments from the request details as fallbacks.
      const extended = {
        FP: [
          ...paths.FP,
          "/attachments/20250930_181148_Fixed price_Supplier_SoW_Template(docx).txt",
          "/attachments/20250930_160627_Fixed price_Supplier_SoW_Template(docx).txt",
          "/attachments/20250930_035346_Fixed price_Supplier_SoW_Template(docx).txt"
        ],
        TM: [
          ...paths.TM,
          "/attachments/20250930_181149_T&M_Supplier_SoW_Template(docx).txt",
          "/attachments/20250930_160627_T&M_Supplier_SoW_Template(docx).txt",
          "/attachments/20250930_035345_T&M_Supplier_SoW_Template(docx).txt"
        ]
      };

      const tryLoad = async (list) => {
        for (const u of list) {
          try {
            const r = await fetch(u);
            if (r.ok) {
              const t = await r.text();
              if (t && t.trim()) return t;
            }
          } catch {}
        }
        return "";
      };

      const [fp, tm] = await Promise.all([tryLoad(extended.FP), tryLoad(extended.TM)]);
      setFpText(fp || "");
      setTmText(tm || "");

      const fpSchema = fp ? buildDynamicTemplateSchemaFromTranscript(fp, "FP", "Fixed Price") : null;
      const tmSchema = tm ? buildDynamicTemplateSchemaFromTranscript(tm, "TM", "Time & Materials") : null;
      setSchemas({ FP: fpSchema, TM: tmSchema });
    }
    loadLatest();
  }, []);

  const isFP = tab === "FP";
  const docText = isFP ? fpText : tmText;
  const previewHtml = useMemo(() => makeTranscriptPreviewHtml(docText), [docText]);

  return (
    <div className="panel">
      <div className="panel-title">Preview Templates</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        <button
          type="button"
          className="btn"
          aria-pressed={isFP}
          onClick={() => setTab("FP")}
          style={isFP ? { boxShadow: "var(--glow-purple)", borderColor: "var(--accent-purple)" } : undefined}
        >
          Fixed Price (FP)
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={!isFP}
          onClick={() => setTab("TM")}
          style={!isFP ? { boxShadow: "var(--glow-purple)", borderColor: "var(--accent-purple)" } : undefined}
        >
          Time & Material (T&M)
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const schema = isFP ? schemas.FP : schemas.TM;
            const text = isFP ? fpText : tmText;
            if (!schema || !text || !text.trim()) {
              alert("This template is not available. Please attach or select a valid template transcript first.");
              return;
            }
            onSelect?.(isFP ? "FP" : "TM", schema, text);
          }}
          disabled={isFP ? !schemas.FP || !fpText || !fpText.trim() : !schemas.TM || !tmText || !tmText.trim()}
          title={
            isFP
              ? (!schemas.FP || !fpText || !fpText.trim() ? "Fixed Price template not loaded. Please attach/select it." : "Select Fixed Price")
              : (!schemas.TM || !tmText || !tmText.trim() ? "T&M template not loaded. Please attach/select it." : "Select T&M")
          }
          aria-label={`Select ${isFP ? "FP" : "TM"} template`}
        >
          Select {isFP ? "FP" : "TM"}
        </button>
        {isFP ? (
          (!fpText || !fpText.trim()) ? <div style={{ color: "var(--text-secondary)" }}>No Fixed Price template loaded. Please attach or select the Fixed Price template transcript.</div> : null
        ) : (
          (!tmText || !tmText.trim()) ? <div style={{ color: "var(--text-secondary)" }}>No T&M template loaded. Please attach or select the T&M template transcript.</div> : null
        )}
      </div>

      {/* Page-like read-only preview of the original transcript */}
      <div style={{ display: "grid", placeItems: "center", padding: 8 }}>
        <div
          style={{
            background: "#fff",
            color: "#111",
            width: "min(780px, 96%)",
            minHeight: 420,
            border: "1px solid #ddd",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            borderRadius: 4,
            padding: "28px 36px",
            overflow: "auto",
            maxHeight: 420
          }}
          aria-live="polite"
        >
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>

      <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 13 }}>
        The preview shows the original DOCX content (as provided). Only detected placeholder fields will be editable in the form.
      </div>
    </div>
  );
}
