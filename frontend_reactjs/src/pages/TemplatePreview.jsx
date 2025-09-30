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
      <div className="panel-title">Templates</div>
      <div style={{ color: "var(--text-secondary)" }}>
        The app automatically selects an internal SOW template based on your choice: Fixed Price or T&M.
      </div>
    </div>
  );
}
