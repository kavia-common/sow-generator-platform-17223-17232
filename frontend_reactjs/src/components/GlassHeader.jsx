import React from "react";
import "./GlassHeader.css";

/**
 * PUBLIC_INTERFACE
 * GlassHeader
 * Glassmorphic, pill-shaped top header that contains brand and CTAs.
 * This version intentionally removes any template selection/upload UI.
 */
export default function GlassHeader({
  onSaveDraft
}) {
  return (
    <header className="site-header" role="banner" aria-label="Main navigation">
      <div className="nav-pill">
        <div className="brand-chip" aria-label="SOW Generator">
          <span role="img" aria-label="spark">✨</span>
          <span>SOW Generator</span>
        </div>

        <div className="header-actions" style={{ marginLeft: "auto" }}>
          <button className="btn btn-primary" onClick={onSaveDraft} title="Save current inputs locally">Save Progress</button>
        </div>
      </div>
    </header>
  );
}
