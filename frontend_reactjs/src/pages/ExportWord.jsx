import React from "react";

/**
 * PUBLIC_INTERFACE
 * ExportWord
 * Informational page; generation is handled by the Preview & Generate step using the step 38 SOW builder.
 */
export default function ExportWord() {
  return (
    <div className="panel">
      <div className="panel-title">Export</div>
      <div style={{ color: "var(--text-secondary)" }}>
        Use the Generate DOCX button in the Preview &amp; Generate step. The export has been rolled back to step 38 (Actions section and signature fields behavior).
      </div>
    </div>
  );
}
