import React from "react";
import "./GlassHeader.css";
import TemplateUploadControl from "./TemplateUploadControl";

/**
 * PUBLIC_INTERFACE
 * GlassHeader
 * Glassmorphic, pill-shaped top header that contains brand, selectors and CTAs.
 * Props mirror TopNav to keep wiring unchanged elsewhere.
 */
export default function GlassHeader({
  templates = [],
  selectedTemplate,
  onTemplateChange,
  onSaveDraft,
  onTemplateUploaded // optional: notify parent to refresh UI state
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
            value={selectedTemplate || ""}
            onChange={(e) => onTemplateChange?.(e.target.value)}
            aria-label="Select Template"
          >
            <option value="" disabled>Select Template</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </nav>

        <TemplateUploadControl onUploaded={onTemplateUploaded} />

        <div className="header-actions">
          <button className="btn btn-primary" onClick={onSaveDraft} title="Save current inputs locally">Save Progress</button>
        </div>
      </div>
    </header>
  );
}
