import React from "react";

/**
 * PUBLIC_INTERFACE
 * ExportWord
 * Informational page; generation is handled by the Preview & Generate step by creating a fresh DOCX from your entries.
 */
export default function ExportWord() {
  return (
    <div className="panel">
      <div className="panel-title">Export</div>
      <div style={{ color: "var(--text-secondary)" }}>
        Use the Generate DOCX button in the Preview &amp; Generate step. The app builds a new Word document directly from your SOW entries—no templates required.
      </div>
    </div>
  );
}
