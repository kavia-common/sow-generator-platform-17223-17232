import React, { useMemo } from 'react';

/**
 * Format a date string (YYYY-MM-DD or JS-parsable) to "MMM d, yyyy".
 */
function formatDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * PUBLIC_INTERFACE
 * SowPreamble
 * Presentational component that renders the preamble sentence under the SOW heading.
 * Optionally renders a compact, read-only summary of key entered fields just beneath the sentence.
 *
 * Props:
 * - startDate: string (YYYY-MM-DD)
 * - endDate: string (YYYY-MM-DD)
 * - supplier: string
 * - showSummary?: boolean (optional) - if true, renders the "All Entered Fields" summary block.
 */
export default function SowPreamble({ startDate, endDate, supplier, showSummary = false }) {
  const rangeText = useMemo(() => {
    const s = formatDate(startDate);
    const e = formatDate(endDate);
    if (!s && !e) return '';
    if (s && e) return `${s} - ${e}`;
    return s || e || '';
  }, [startDate, endDate]);

  return (
    <div className="w-full" style={{ color: '#374151' }}>
      <p className="text-gray-700 leading-relaxed" style={{ color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
        The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between {rangeText ? `[${rangeText}]` : '[]'}, and {supplier ? `[${supplier}]` : '[]'} (the “Supplier”), as amended from time to time (the “Agreement”). Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.
      </p>

      {showSummary ? (
        <div
          aria-label="All Entered Fields"
          style={{
            marginTop: 8,
            padding: '8px 10px',
            border: '1px solid rgba(55,65,81,0.2)',
            borderRadius: 8,
            background: 'linear-gradient(180deg, rgba(249,250,251,0.65), rgba(249,250,251,0.4))',
            color: '#374151'
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.2, marginBottom: 6, color: '#4B5563' }}>
            All Entered Fields
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr',
              columnGap: 8,
              rowGap: 4,
              alignItems: 'start'
            }}
          >
            <div style={{ color: '#6B7280' }}>Start Date</div>
            <div>{rangeText?.split(' - ')[0] || (startDate ? formatDate(startDate) : '—')}</div>

            <div style={{ color: '#6B7280' }}>End Date</div>
            <div>{rangeText?.split(' - ')[1] || (endDate ? formatDate(endDate) : '—')}</div>

            <div style={{ color: '#6B7280' }}>Supplier</div>
            <div>{supplier || '—'}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
