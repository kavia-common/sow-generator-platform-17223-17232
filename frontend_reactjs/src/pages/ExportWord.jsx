import React from "react";

/**
 * PUBLIC_INTERFACE
 * ExportWord
 * This component intentionally avoids generating any DOCX content by itself.
 * The application uses ONLY the uploaded template for export. Please use the
 * Generate DOCX action on the preview/generate screen which merges data into
 * your exact uploaded template without overlays or defaults.
 */
export default function ExportWord() {
  return (
    <div className="panel">
      <div className="panel-title">Export</div>
      <div style={{ color: "var(--text-secondary)" }}>
        Exports are generated strictly from your uploaded .docx template. Use the Generate DOCX button in the preview/generate screen.
      </div>
    </div>
  );
}
