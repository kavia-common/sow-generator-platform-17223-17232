import React from 'react';
import './GlassHeader.css';
import '../theme.css';

/**
 * PUBLIC_INTERFACE
 * GlassHeader
 * Floating translucent pill header with quick actions.
 */
export default function GlassHeader({ onSaveDraft }) {
  return (
    <div className="site-header">
      <div className="nav-pill" role="toolbar" aria-label="Quick actions">
        <div className="brand-chip">
          <span role="img" aria-label="spark">✨</span>
          <span>SOW Generator</span>
        </div>
        <div className="nav-links" role="navigation" aria-label="Sections">
          <a href="#template">Template</a>
          <a href="#form">Form</a>
          <a href="#generate">Generate</a>
        </div>
        <div className="header-actions">
          <button className="btn" type="button" onClick={onSaveDraft}>Save Draft</button>
        </div>
      </div>
    </div>
  );
}
