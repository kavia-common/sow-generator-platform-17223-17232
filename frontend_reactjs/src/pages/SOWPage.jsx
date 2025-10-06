import React from 'react';
import SowPreamble from '../components/SowPreamble';

/**
 * PUBLIC_INTERFACE
 * SOWPage
 * Minimal page rendering the SOW heading with the required preamble sentence only.
 */
export default function SOWPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6" style={{ maxWidth: 960, margin: '0 auto', padding: '16px' }}>
      <header className="mb-4" style={{ marginBottom: 12 }}>
        <h1 className="text-2xl font-semibold text-gray-800" style={{ fontSize: 22, fontWeight: 700, color: '#374151' }}>
          Statement of Work to Master Service Agreement
        </h1>
      </header>

      {/* If values are not provided by parent state, SowPreamble will gracefully show [] placeholders */}
      <SowPreamble startDate={''} endDate={''} supplier={''} />

      {/* ...rest of SOW content... */}
    </div>
  );
}
