import React from "react";

/**
 * PUBLIC_INTERFACE
 * ExportWord
 * Informational page; generation is handled by the Preview & Generate step using internal templates.
 */
export default function ExportWord() {
  return (
    <div className="panel">
      <div className="panel-title">Export</div>
      <div style={{ color: "var(--text-secondary)" }}>
        Exports are generated from the internal .docx template for your chosen SOW type. Use the Generate DOCX button in the Preview &amp; Generate step.
      </div>
    </div>
  );
}
