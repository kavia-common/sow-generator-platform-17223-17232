import React, { useCallback, useEffect } from "react";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Restored to step 38 behavior: builds SOW with Actions section and signature fields as of that revision.
 *
 * Props:
 * - data: { meta?: { client?: string, title?: string, sowType?: "TM"|"FP", logoUrl?: string }, templateData?: Record<string, any> }
 * - templateSchema?: unused for the fixed layout at step 38, but accepted for API compatibility
 * - autoGenerate?: boolean  If true, immediately trigger generation on mount/update (used for one-click submit).
 */
export default function DocxPreviewAndGenerate({ data, templateSchema, autoGenerate = false }) {
  const onGenerate = useCallback(async () => {
    const { buildSowDocx, makeSowDocxFilename } = await import("../services/sowDocxBuilder.js");
    const blob = await buildSowDocx(data || {}, templateSchema);
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
          title="Generate the step 38 SOW DOCX layout"
        >
          Generate DOCX
        </button>
        <div style={{ color: "var(--text-secondary)" }}>
          Restored SOW layout to step 38 (includes Actions section and signature fields as at that step).
        </div>
      </div>
    </div>
  );
}
