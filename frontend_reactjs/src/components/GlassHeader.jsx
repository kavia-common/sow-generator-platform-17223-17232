import React, { useState } from "react";
import "./GlassHeader.css";

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
  onOpenTemplateManager, // opens a modal/panel for managing templates (add/delete drafts)
  onDeleteTemplate // delete selected template (supports drafts)
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

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
          <button className="btn" type="button" onClick={() => onOpenTemplateManager?.()}>
            Manage Templates
          </button>
        </nav>

        <div className="header-actions">
          <button className="btn" type="button" onClick={() => setConfirmOpen(true)} disabled={!selectedTemplate} title="Delete selected template (drafts only)">
            Delete
          </button>
          <button className="btn btn-primary" onClick={onSaveDraft}>Save</button>
        </div>
      </div>

      {confirmOpen && (
        <div role="dialog" aria-modal="true" aria-label="Confirm delete template" style={{position:"fixed", inset:0, display:"grid", placeItems:"center", zIndex:70, background:"rgba(0,0,0,0.5)"}}>
          <div className="panel" style={{width:"min(420px,92vw)"}}>
            <div className="panel-title">Delete Template</div>
            <div style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
              Are you sure you want to delete the selected template? Only draft templates can be deleted.
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn" type="button" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  onDeleteTemplate?.(selectedTemplate);
                  setConfirmOpen(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
