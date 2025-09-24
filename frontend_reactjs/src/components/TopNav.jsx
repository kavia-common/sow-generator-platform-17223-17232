import React from "react";

/**
 * PUBLIC_INTERFACE
 * Legacy TopNav component (kept for compatibility).
 * Prefer using GlassHeader for the new glassmorphic header.
 */
export default function TopNav({ projects, templates, selectedProject, selectedTemplate, onProjectChange, onTemplateChange, onNewProject, onSaveDraft }) {
  return (
    <div style={{ display: "none" }}>
      {/* Deprecated visual in favor of GlassHeader; still exported to avoid import errors elsewhere */}
    </div>
  );
}
