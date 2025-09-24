import React from "react";

// PUBLIC_INTERFACE
export default function CompanyDetails({ data, onChange }) {
  /** Company details capture: name, logo URL, contact */
  return (
    <div className="panel">
      <div className="panel-title">Company Details</div>
      <div className="form-grid">
        <div className="form-control">
          <label className="label">Company Name</label>
          <input className="input" value={data.name || ""} onChange={(e) => onChange({ ...data, name: e.target.value })} placeholder="Acme Corp." />
        </div>
        <div className="form-control">
          <label className="label">Logo URL</label>
          <input className="input" value={data.logo || ""} onChange={(e) => onChange({ ...data, logo: e.target.value })} placeholder="https://..." />
        </div>
        <div className="form-control">
          <label className="label">Contact Person</label>
          <input className="input" value={data.contact || ""} onChange={(e) => onChange({ ...data, contact: e.target.value })} placeholder="Jane Doe" />
        </div>
        <div className="form-control">
          <label className="label">Contact Email</label>
          <input className="input" value={data.email || ""} onChange={(e) => onChange({ ...data, email: e.target.value })} placeholder="jane@acme.com" />
        </div>
      </div>
    </div>
  );
}
