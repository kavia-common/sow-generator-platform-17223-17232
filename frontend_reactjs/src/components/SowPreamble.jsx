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
 * Inline preamble inputs (Start Date, End Date, Supplier) and the specified sentence directly under the SOW heading.
 *
 * Props:
 * - startDate: string (YYYY-MM-DD)
 * - endDate: string (YYYY-MM-DD)
 * - supplier: string
 * - onChange: (patch: Partial<{startDate,endDate,supplier}>) => void
 */
export default function SowPreamble({ startDate, endDate, supplier, onChange }) {
  const rangeText = useMemo(() => {
    const s = formatDate(startDate);
    const e = formatDate(endDate);
    if (!s && !e) return '';
    if (s && e) return `${s} - ${e}`;
    return s || e || '';
  }, [startDate, endDate]);

  return (
    <div className="w-full" style={{ color: '#374151' }}>
      {/* Inline fields under the SOW heading, no 'Preamble' label */}
      <div
        className="flex flex-wrap gap-3 items-end mb-3"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}
      >
        <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="text-sm text-gray-600" style={{ fontSize: 12, color: '#6B7280' }}>Start date</label>
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => onChange?.({ startDate: e.target.value })}
            className="border rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
            style={{
              border: '1px solid var(--ui-border)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#111827',
              outline: 'none',
              boxShadow: '0 0 0 0 rgba(0,0,0,0)',
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(244,114,182,.25)'; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'; }}
          />
        </div>
        <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="text-sm text-gray-600" style={{ fontSize: 12, color: '#6B7280' }}>End date</label>
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => onChange?.({ endDate: e.target.value })}
            className="border rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
            style={{
              border: '1px solid var(--ui-border)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#111827',
              outline: 'none',
              boxShadow: '0 0 0 0 rgba(0,0,0,0)',
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(244,114,182,.25)'; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'; }}
          />
        </div>
        <div className="flex flex-col min-w-[220px]" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
          <label className="text-sm text-gray-600" style={{ fontSize: 12, color: '#6B7280' }}>Supplier name</label>
          <input
            type="text"
            placeholder="Supplier"
            value={supplier || ''}
            onChange={(e) => onChange?.({ supplier: e.target.value })}
            className="border rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
            style={{
              border: '1px solid var(--ui-border)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#111827',
              outline: 'none',
              boxShadow: '0 0 0 0 rgba(0,0,0,0)',
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(244,114,182,.25)'; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'; }}
          />
        </div>
      </div>

      {/* Sentence directly under heading */}
      <p className="text-gray-700 leading-relaxed" style={{ color: '#374151', lineHeight: 1.6 }}>
        The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between {rangeText ? `[${rangeText}]` : '[startdate - enddate]'}, and {supplier ? `[${supplier}]` : '[supplier]'} (the “Supplier”), as amended from time to time (the “Agreement”). Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.
      </p>
    </div>
  );
}
