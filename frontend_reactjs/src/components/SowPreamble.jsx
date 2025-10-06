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
 * Read-only preamble sentence directly under the SOW heading.
 *
 * Props:
 * - startDate: string (YYYY-MM-DD) from Client Portfolio state
 * - endDate: string (YYYY-MM-DD) from Client Portfolio state
 * - supplier: string from Client Portfolio state
 * - onChange: unused (left for backward compatibility; ignored)
 */
export default function SowPreamble({ startDate, endDate, supplier }) {
  const rangeText = useMemo(() => {
    const s = formatDate(startDate);
    const e = formatDate(endDate);
    if (!s && !e) return '';
    if (s && e) return `${s} - ${e}`;
    return s || e || '';
  }, [startDate, endDate]);

  return (
    <div className="w-full" style={{ color: '#374151' }}>
      {/* Sentence directly under heading; values sourced exclusively from Client Portfolio (props) */}
      <p className="text-gray-700 leading-relaxed" style={{ color: '#374151', lineHeight: 1.6, margin: 0 }}>
        The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between {rangeText ? `[${rangeText}]` : '[startdate - enddate]'}, and {supplier ? `[${supplier}]` : '[supplier]'} (the “Supplier”), as amended from time to time (the “Agreement”). Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.
      </p>
    </div>
  );
}
