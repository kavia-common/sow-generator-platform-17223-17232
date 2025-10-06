import React from 'react';
import '../theme.css';

/**
 * PUBLIC_INTERFACE
 * SowPreamble
 * Inline preamble inputs and shows the required sentence preview (no logo rendering here).
 */
export default function SowPreamble({ value, onChange }) {
  const preamble = value?.preamble || {};
  const set = (k, v) => onChange?.({ ...value, preamble: { ...(value?.preamble || {}), [k]: v } });

  return (
    <div className="panel" style={{ marginBottom: 8 }}>
      <div className="panel-title">Preamble</div>
      <div className="form-grid">
        <div className="form-control">
          <label className="label">Start Date</label>
          <input className="input" type="date" value={preamble.startDate || ''} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div className="form-control">
          <label className="label">End Date</label>
          <input className="input" type="date" value={preamble.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
        </div>
        <div className="form-control">
          <label className="label">Supplier</label>
          <input className="input" type="text" value={preamble.supplier || ''} onChange={(e) => set('supplier', e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 10 }} className="text-muted">
        The Statement of Work references and is executed subject to and in accordance with the terms and conditions contained in the Master Services Agreement entered between [{preamble.startDate || 'startdate'}{preamble.startDate || preamble.endDate ? ' - ' : ''}{preamble.endDate || 'enddate'}], and [{preamble.supplier || 'supplier'}] (the “Supplier”), as amended from time to time (the “Agreement”). Capitalized terms not defined in this Statement of Work have the meaning given in the Agreement. This Statement of Work becomes effective when signed by Supplier where indicated below in the Section headed ‘Authorization’.
      </div>
    </div>
  );
}
