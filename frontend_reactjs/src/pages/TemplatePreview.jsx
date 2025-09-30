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

      const [fp, tm] = await Promise.all([tryLoad(paths.FP), tryLoad(paths.TM)]);
      setFpText(fp || "Unable to load Fixed Price template preview.");
      setTmText(tm || "Unable to load T&M template preview.");

      const fpSchema = buildDynamicTemplateSchemaFromTranscript(fp, "FP", "Fixed Price");
      const tmSchema = buildDynamicTemplateSchemaFromTranscript(tm, "TM", "Time & Materials");
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
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
          onClick={() => onSelect?.(isFP ? "FP" : "TM", isFP ? schemas.FP : schemas.TM, isFP ? fpText : tmText)}
          aria-label={`Select ${isFP ? "FP" : "TM"} template`}
        >
          Select {isFP ? "FP" : "TM"}
        </button>
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
