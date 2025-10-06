import React, { useState, useCallback } from 'react';
import SowPreamble from '../components/SowPreamble';

/**
 * PUBLIC_INTERFACE
 * SOWPage
 * Minimal page rendering the SOW heading with inline preamble inputs and the required sentence.
 */
export default function SOWPage() {
  const [preamble, setPreamble] = useState({ startDate: '', endDate: '', supplier: '' });
  const onPreambleChange = useCallback((patch) => setPreamble((prev) => ({ ...prev, ...patch })), []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" style={{ maxWidth: 960, margin: '0 auto', padding: '16px' }}>
      <header className="mb-4" style={{ marginBottom: 12 }}>
        <h1 className="text-2xl font-semibold text-gray-800" style={{ fontSize: 22, fontWeight: 700, color: '#374151' }}>
          Statement of Work to Master Service Agreement
        </h1>
      </header>

      <SowPreamble
        startDate={preamble.startDate}
        endDate={preamble.endDate}
        supplier={preamble.supplier}
        onChange={onPreambleChange}
      />

      {/* ...rest of SOW form/content... */}
    </div>
  );
}
