import React from 'react';
import logo from '../logo.svg';

/**
 * PUBLIC_INTERFACE
 * Header
 * Simple header bar with brand logo and title.
 * Ensures the logo displays using module import with a fallback to PUBLIC_URL.
 */
export default function Header() {
  return (
    <div className="w-full bg-white border-b" style={{ background: '#fff', borderBottom: '1px solid var(--ui-border)' }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3" style={{ maxWidth: 1120, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={logo}
          alt="Logo"
          className="h-8 w-auto"
          style={{ height: 32, width: 'auto' }}
          onError={(e) => {
            // Fallback to public path if asset import fails
            e.currentTarget.onerror = null;
            e.currentTarget.src = `${process.env.PUBLIC_URL || ''}/logo.svg`;
          }}
        />
        <span className="font-medium text-gray-800" style={{ fontWeight: 600, color: '#374151' }}>SOW Generator</span>
      </div>
    </div>
  );
}
