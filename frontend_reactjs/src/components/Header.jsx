import React from 'react';
import '../theme.css';
import logo from '../logo.svg';

/**
 * PUBLIC_INTERFACE
 * Header
 * Simple header bar with brand logo and title using dark theme.
 */
export default function Header() {
  return (
    <div className="header" style={{
      background: 'linear-gradient(180deg, #0f0f14, #0b0b0d)',
      borderBottom: '1px solid var(--color-border)',
      color: 'var(--color-text)',
      padding: '8px 12px'
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={logo}
          alt="Logo"
          style={{ height: 28, width: 'auto' }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = `${process.env.PUBLIC_URL || ''}/logo.svg`;
          }}
        />
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>SOW Generator</span>
      </div>
    </div>
  );
}
