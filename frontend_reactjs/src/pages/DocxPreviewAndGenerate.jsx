import React, { useCallback, useEffect } from "react";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Builds a fresh, valid DOCX directly from SOW form values without using any external .docx templates.
 *
 * Props:
 * - data: { meta?: { client?: string, title?: string, sowType?: "TM"|"FP", logoUrl?: string }, templateData?: Record<string, any> }
 * - templateSchema?: sectioned or flat schema describing fields to list in the output
 * - autoGenerate?: boolean  If true, immediately trigger generation on mount/update (used for one-click submit).
 */
export default function DocxPreviewAndGenerate({ data, templateSchema, autoGenerate = false }) {
  const onGenerate = useCallback(async () => {
    try {
      const { buildSowDocx, makeSowDocxFilename } = await import("../services/sowDocxBuilder.js");
      const safeData = data || {};
      const safeSchema = templateSchema || { fields: [] };
      const blob = await buildSowDocx(safeData, safeSchema);
      const name = makeSowDocxFilename(safeData);
      triggerDownload(blob, name);
    } catch (err) {
      // Provide immediate feedback if generation fails (e.g., missing 'docx' dependency or runtime error)
      console.error("DOCX generation failed:", err);
      const msg = (err && (err.userMessage || err.message)) ? String(err.userMessage || err.message) : "";
      const hint = "Sorry, we couldn't generate the DOCX file.";
      alert(msg ? `${hint}\n\nDetails:\n${msg}` : `${hint} Please try again. If the problem persists, refresh the page.`);
    }
  }, [data, templateSchema]);

  useEffect(() => {
    if (autoGenerate) {
      onGenerate();
    }
  }, [autoGenerate, onGenerate]);

  function triggerDownload(blob, filename) {
    try {
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename || "SOW.docx";
      document.body.appendChild(link);
      link.click();
      requestAnimationFrame(() => {
        try { URL.revokeObjectURL(url); } catch {}
        link.remove();
      });
    } catch (e) {
      console.error("Failed to trigger download:", e);
      alert("We built your file but couldn't start the download automatically. Please try again.");
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">Generate DOCX</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onGenerate}
          title="Generate a new DOCX directly from your entries"
        >
          Generate DOCX
        </button>
        <div style={{ color: "var(--text-secondary)" }}>
          Generates a clean DOCX from your SOW entries. No templates are used.
        </div>
      </div>
    </div>
  );
}
