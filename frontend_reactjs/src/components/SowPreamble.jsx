import React from 'react';

/**
 * PUBLIC_INTERFACE
 * SowPreamble
 * Render the required sentence under the SOW heading without inline inputs.
 *
 * Props:
 * - startDate: string (optional, kept for compatibility; not rendered)
 * - endDate: string (optional, kept for compatibility; not rendered)
 * - supplier: string (optional, kept for compatibility; not rendered)
 * - onChange: (patch) => void (unused)
 */
export default function SowPreamble() {
  return (
    <div className="w-full" style={{ color: '#374151' }}>
      <p className="text-gray-700 leading-relaxed" style={{ color: '#374151', lineHeight: 1.6, marginTop: 4, marginBottom: 8 }}>
        The Statement of Work references and is executed subject to and in accordance with the terms and conditions
        contained in the Master Services Agreement. Capitalized terms not defined in this Statement of Work have the
        meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated
        below in the Section headed ‘Authorization’.
      </p>
    </div>
  );
}
