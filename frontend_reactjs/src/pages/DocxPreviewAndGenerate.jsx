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
    const { buildSowDocx, makeSowDocxFilename } = await import("../services/sowDocxBuilder.js");
    // Pass templateSchema through as-is; builder will collect all fields from schema and data
    const blob = await buildSowDocx(data || {}, templateSchema || { fields: [] });
    const name = makeSowDocxFilename(data || {});
    triggerDownload(blob, name);
  }, [data, templateSchema]);

  useEffect(() => {
    if (autoGenerate) {
      onGenerate();
    }
  }, [autoGenerate, onGenerate]);

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
