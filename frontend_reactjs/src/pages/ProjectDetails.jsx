import React from "react";

// PUBLIC_INTERFACE
export default function ProjectDetails({ data, onChange }) {
  /** Project details: overview, scope, deliverables, roles, acceptance criteria */
  return (
    <div className="panel">
      <div className="panel-title">Project Details</div>
      <div className="form-grid">
        <div className="form-control">
          <label className="label">Project Overview</label>
          <textarea className="textarea" value={data.overview || ""} onChange={(e) => onChange({ ...data, overview: e.target.value })} placeholder="High-level description..." />
        </div>
        <div className="form-control">
          <label className="label">Scope</label>
          <textarea className="textarea" value={data.scope || ""} onChange={(e) => onChange({ ...data, scope: e.target.value })} placeholder="In-scope items..." />
        </div>
        <div className="form-control">
          <label className="label">Deliverables</label>
          <textarea className="textarea" value={data.deliverables || ""} onChange={(e) => onChange({ ...data, deliverables: e.target.value })} placeholder="List of deliverables..." />
        </div>
        <div className="form-control">
          <label className="label">Roles</label>
          <textarea className="textarea" value={data.roles || ""} onChange={(e) => onChange({ ...data, roles: e.target.value })} placeholder="Team roles and responsibilities..." />
        </div>
        <div className="form-control">
          <label className="label">Acceptance Criteria</label>
          <textarea className="textarea" value={data.acceptance || ""} onChange={(e) => onChange({ ...data, acceptance: e.target.value })} placeholder="Acceptance criteria..." />
        </div>
      </div>
    </div>
  );
}
