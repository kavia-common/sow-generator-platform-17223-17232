import React from "react";

/**
 * PUBLIC_INTERFACE
 * TemplatePreview
 * Deprecated interactive preview. Upload/selection has been removed.
 * This component now renders a small hint; the app auto-selects internal templates by SOW type.
 */
export default function TemplatePreview() {
  return (
    <div className="panel">
      <div className="panel-title">Actions</div>
      <div style={{ color: "var(--text-secondary)" }}>
        Select your SOW type and proceed to fill the form or generate the document.
      </div>
    </div>
  );
}
