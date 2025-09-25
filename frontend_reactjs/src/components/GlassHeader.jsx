import React from "react";
import "./GlassHeader.css";

/**
 * PUBLIC_INTERFACE
 * GlassHeader
 * Glassmorphic, pill-shaped top header that contains brand, selectors and CTAs.
 * Props mirror TopNav to keep wiring unchanged elsewhere.
 */
export default function GlassHeader({
  projects = [],
  templates = [],
  selectedProject,
  selectedTemplate,
  onProjectChange,
  onTemplateChange,
  onSaveDraft
}) {
  return (
    <header className="site-header" role="banner" aria-label="Main navigation">
      <div className="nav-pill">
        <div className="brand-chip" aria-label="SOW Generator">
          <span role="img" aria-label="spark">✨</span>
          <span>SOW Generator</span>
        </div>
        <nav className="nav-links" aria-label="Selectors">
          <select
            className="select"
            value={selectedProject || ""}
            onChange={(e) => onProjectChange?.(e.target.value)}
            aria-label="Select Project"
          >
            <option value="" disabled>Select Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            className="select"
            value={selectedTemplate || ""}
            onChange={(e) => onTemplateChange?.(e.target.value)}
            aria-label="Select Template"
          >
            <option value="" disabled>Select Template</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </nav>

        <div className="header-actions">
          {/* Removed "New" to disable add-new actions */}
          <button className="btn btn-primary" onClick={onSaveDraft}>Save</button>
        </div>
      </div>
    </header>
  );
}
