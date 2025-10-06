import React, { useState } from 'react';
import './AIChatWizard.css';
import '../theme.css';

/**
 * PUBLIC_INTERFACE
 * AIChatWidget (Wizard)
 * Collapsible assistant panel to package SOW state; non-functional stub aligning to theme.
 */
export default function AIChatWidget({ projectTitle, position = 'right', onPackage }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="wiz-fab"
        style={{ [position]: 16 }}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="ai-wiz-panel"
        title="Open Assistant"
      >
        💬
      </button>
      <div id="ai-wiz-panel" className={`wiz-panel ${open ? 'open' : ''}`} role="dialog" aria-modal="false" aria-label="AI Assistant">
        <div className="wiz-header">
          <div className="wiz-header-title">
            <div className="wiz-overline">Assistant</div>
            <div className="wiz-title">{projectTitle || 'Statement of Work'}</div>
          </div>
          <div>
            <button className="btn" onClick={() => onPackage?.({})}>Package State</button>
            <button className="btn" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
        <div className="wiz-body">
          <div className="wiz-log">
            <div className="wiz-bubble bot">Hi! I can help you prepare your SOW.</div>
            <div className="wiz-bubble user">Great, thanks!</div>
          </div>
          <div className="wiz-upload" aria-label="Upload files">
            <div>Upload reference docs (optional)</div>
            <div className="wiz-previews"></div>
          </div>
        </div>
        <div className="wiz-footer">Tip: Use the form to enter details, then Generate DOCX when ready.</div>
      </div>
    </>
  );
}
