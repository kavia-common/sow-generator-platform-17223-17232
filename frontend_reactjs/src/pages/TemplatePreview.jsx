import React from "react";
import "../theme.css";
import "../styles.css";

/**
 * PUBLIC_INTERFACE
 * TemplatePreview
 * Helper card with instructions.
 */
export default function TemplatePreview() {
  return (
    <div className="panel">
      <div className="panel-title">Actions</div>
      <div className="text-muted">
        Select your SOW type and proceed to fill the form or generate the document.
      </div>
    </div>
  );
}
