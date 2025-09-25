import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * SOWForm
 * Interactive data collection for all required SOW template fields (excluding the Answer column),
 * including logo upload and display. Produces a structured JSON payload suitable for Word export.
 */
export default function SOWForm({ value, onChange, selectedTemplate, templateSchema }) {
  const [data, setData] = useState(
    value || {
      meta: { title: "", client: "", date: "", version: "", prepared_by: "", stakeholders: [], logoUrl: "", logoName: "" },
      background: { project_background: "", business_problem: "", objectives: "", success_criteria: "" },
      scope: { in_scope: [], out_of_scope: [], assumptions: [], constraints: [], dependencies: [] },
      deliverables: { items: [], milestones: [], timeline: [], acceptance_criteria: "" },
      roles: { sponsor: "", pm: "", tech_lead: "", team: [], client_responsibilities: "" },
      approach: { solution_overview: "", tech_stack: [], data_sources: [], security: "", qa_strategy: "" },
      governance: { comm_plan: "", reporting: "", meetings: "", risk_mgmt: "", change_control: "" },
      commercials: { pricing_model: "", budget: "", payment_terms: "", invoicing: "" },
      legal: { confidentiality: "", ip: "", sla: "", termination: "", warranties: "" },
      signoff: { signatories: [], date: "" },
      templateMeta: value?.templateMeta || null,
      templateData: value?.templateData || {}
    }
  );

  useEffect(() => {
    onChange?.(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Sync local when parent value updates (e.g., after selecting a template)
  useEffect(() => {
    if (value) setData(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setTemplateField = (path, v) => {
    setData((prev) => {
      const next = structuredClone(prev);
      if (!next.templateData) next.templateData = {};
      setPath(next.templateData, path, v);
      return next;
    });
  };

  const logoInputRef = useRef(null);
  const onLogoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setData((prev) => ({
        ...prev,
        meta: { ...prev.meta, logoUrl: reader.result, logoName: file.name }
      }));
    };
    reader.readAsDataURL(file);
  };

  const addToList = (path) => {
    const val = prompt("Add item:");
    if (!val) return;
    setData((prev) => {
      const next = structuredClone(prev);
      const arr = getPath(next, path);
      arr.push(val);
      return next;
    });
  };
  const removeFromList = (path, idx) => {
    setData((prev) => {
      const next = structuredClone(prev);
      const arr = getPath(next, path);
      arr.splice(idx, 1);
      return next;
    });
  };
  const setField = (path, v) => {
    setData((prev) => {
      const next = structuredClone(prev);
      setPath(next, path, v);
      return next;
    });
  };

  const logoPreview = useMemo(() => {
    const url = data?.meta?.logoUrl;
    if (!url) return null;
    return <img alt="Company logo" src={url} style={{ maxHeight: 56, maxWidth: 180, borderRadius: 8, border: "1px solid var(--ui-border)" }} />;
  }, [data?.meta?.logoUrl]);

  return (
    <div className="panel">
      <div className="panel-title">SOW Data Collection</div>

      {templateSchema ? (
        <Section title={`Template Specific Fields — ${templateSchema.title}`}>
          <div style={{ gridColumn: "1 / -1", color: "var(--text-secondary)", marginBottom: 8 }}>
            Selected Template: {selectedTemplate || templateSchema.id}
          </div>
          {(templateSchema.fields || []).map((f) => (
            <DynamicTemplateField
              key={f.key}
              field={f}
              value={getPath(data.templateData || {}, [f.key])}
              onChange={(v) => setTemplateField([f.key], v)}
            />
          ))}
        </Section>
      ) : null}

      {/* Meta */}
      <div className="form-grid">
        <div className="form-control">
          <label className="label">Project Title</label>
          <input className="input" value={data.meta.title} onChange={(e) => setField(["meta","title"], e.target.value)} placeholder="Project Phoenix" />
        </div>
        <div className="form-control">
          <label className="label">Client / Organization</label>
          <input className="input" value={data.meta.client} onChange={(e) => setField(["meta","client"], e.target.value)} placeholder="Acme Corp." />
        </div>
        <div className="form-control">
          <label className="label">Date</label>
          <input className="input" type="date" value={data.meta.date} onChange={(e) => setField(["meta","date"], e.target.value)} />
        </div>
        <div className="form-control">
          <label className="label">Version / Revision</label>
          <input className="input" value={data.meta.version} onChange={(e) => setField(["meta","version"], e.target.value)} placeholder="v1.0" />
        </div>
        <div className="form-control">
          <label className="label">Prepared By</label>
          <input className="input" value={data.meta.prepared_by} onChange={(e) => setField(["meta","prepared_by"], e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="form-control">
          <label className="label">Stakeholders / Approvers (comma-separated)</label>
          <input
            className="input"
            value={(data.meta.stakeholders || []).join(", ")}
            onChange={(e) => setField(["meta","stakeholders"], splitCsv(e.target.value))}
            placeholder="John Smith, Tara Lee"
          />
        </div>

        <div className="form-control" style={{ gridColumn: "1 / -1" }}>
          <label className="label">Logo Upload</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => logoInputRef.current?.click()}>Choose Logo</button>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogoPick} style={{ display: "none" }} />
            <div style={{ color: "var(--text-secondary)" }}>{data.meta.logoName || "No file selected"}</div>
            {logoPreview}
          </div>
        </div>
      </div>

      {/* Background & Objectives */}
      <Section title="Background & Objectives">
        <Field label="Project Background" value={data.background.project_background} onChange={(v)=>setField(["background","project_background"], v)} />
        <Field label="Business Problem" value={data.background.business_problem} onChange={(v)=>setField(["background","business_problem"], v)} />
        <Field label="Objectives / Goals" value={data.background.objectives} onChange={(v)=>setField(["background","objectives"], v)} />
        <Field label="Success Criteria / KPIs" value={data.background.success_criteria} onChange={(v)=>setField(["background","success_criteria"], v)} />
      </Section>

      {/* Scope */}
      <Section title="Scope">
        <ListField title="In-Scope Items" path={["scope","in_scope"]} items={data.scope.in_scope} onAdd={addToList} onRemove={removeFromList} />
        <ListField title="Out-of-Scope Items" path={["scope","out_of_scope"]} items={data.scope.out_of_scope} onAdd={addToList} onRemove={removeFromList} />
        <ListField title="Assumptions" path={["scope","assumptions"]} items={data.scope.assumptions} onAdd={addToList} onRemove={removeFromList} />
        <ListField title="Constraints" path={["scope","constraints"]} items={data.scope.constraints} onAdd={addToList} onRemove={removeFromList} />
        <ListField title="Dependencies" path={["scope","dependencies"]} items={data.scope.dependencies} onAdd={addToList} onRemove={removeFromList} />
      </Section>

      {/* Deliverables & Schedule */}
      <Section title="Deliverables & Schedule">
        <ListField title="Deliverables" path={["deliverables","items"]} items={data.deliverables.items} onAdd={addToList} onRemove={removeFromList} />
        <ListField title="Milestones" path={["deliverables","milestones"]} items={data.deliverables.milestones} onAdd={addToList} onRemove={removeFromList} />
        <ListField title="Timeline / Schedule" path={["deliverables","timeline"]} items={data.deliverables.timeline} onAdd={addToList} onRemove={removeFromList} />
        <Field label="Acceptance Criteria" value={data.deliverables.acceptance_criteria} onChange={(v)=>setField(["deliverables","acceptance_criteria"], v)} />
      </Section>

      {/* Roles & Responsibilities */}
      <Section title="Roles & Responsibilities">
        <Input label="Project Sponsor" value={data.roles.sponsor} onChange={(v)=>setField(["roles","sponsor"], v)} />
        <Input label="Project Manager" value={data.roles.pm} onChange={(v)=>setField(["roles","pm"], v)} />
        <Input label="Technical Lead" value={data.roles.tech_lead} onChange={(v)=>setField(["roles","tech_lead"], v)} />
        <ListField title="Team Members / Roles" path={["roles","team"]} items={data.roles.team} onAdd={addToList} onRemove={removeFromList} />
        <Field label="Client Responsibilities" value={data.roles.client_responsibilities} onChange={(v)=>setField(["roles","client_responsibilities"], v)} />
      </Section>

      {/* Approach & Methodology */}
      <Section title="Approach & Methodology">
        <Field label="Solution Overview" value={data.approach.solution_overview} onChange={(v)=>setField(["approach","solution_overview"], v)} />
        <ListField title="Technical Stack / Tools" path={["approach","tech_stack"]} items={data.approach.tech_stack} onAdd={addToList} onRemove={removeFromList} />
        <ListField title="Data Sources / Integrations" path={["approach","data_sources"]} items={data.approach.data_sources} onAdd={addToList} onRemove={removeFromList} />
        <Field label="Security & Compliance" value={data.approach.security} onChange={(v)=>setField(["approach","security"], v)} />
        <Field label="QA & Testing Strategy" value={data.approach.qa_strategy} onChange={(v)=>setField(["approach","qa_strategy"], v)} />
      </Section>

      {/* Governance */}
      <Section title="Governance & Communication">
        <Field label="Communication Plan" value={data.governance.comm_plan} onChange={(v)=>setField(["governance","comm_plan"], v)} />
        <Field label="Status Reporting Cadence" value={data.governance.reporting} onChange={(v)=>setField(["governance","reporting"], v)} />
        <Field label="Meeting Schedule" value={data.governance.meetings} onChange={(v)=>setField(["governance","meetings"], v)} />
        <Field label="Risk Management Plan" value={data.governance.risk_mgmt} onChange={(v)=>setField(["governance","risk_mgmt"], v)} />
        <Field label="Change Control Process" value={data.governance.change_control} onChange={(v)=>setField(["governance","change_control"], v)} />
      </Section>

      {/* Commercials */}
      <Section title="Commercials">
        <Input label="Pricing Model" value={data.commercials.pricing_model} onChange={(v)=>setField(["commercials","pricing_model"], v)} />
        <Input label="Estimated Cost / Budget" value={data.commercials.budget} onChange={(v)=>setField(["commercials","budget"], v)} />
        <Input label="Payment Terms" value={data.commercials.payment_terms} onChange={(v)=>setField(["commercials","payment_terms"], v)} />
        <Input label="Invoicing Schedule" value={data.commercials.invoicing} onChange={(v)=>setField(["commercials","invoicing"], v)} />
      </Section>

      {/* Legal */}
      <Section title="Legal & Terms">
        <Field label="Confidentiality" value={data.legal.confidentiality} onChange={(v)=>setField(["legal","confidentiality"], v)} />
        <Field label="IP Ownership" value={data.legal.ip} onChange={(v)=>setField(["legal","ip"], v)} />
        <Field label="Service Level Agreements (SLA)" value={data.legal.sla} onChange={(v)=>setField(["legal","sla"], v)} />
        <Field label="Termination" value={data.legal.termination} onChange={(v)=>setField(["legal","termination"], v)} />
        <Field label="Warranties & Liabilities" value={data.legal.warranties} onChange={(v)=>setField(["legal","warranties"], v)} />
      </Section>

      {/* Sign-off */}
      <Section title="Sign-off">
        <ListField title="Signatories" path={["signoff","signatories"]} items={data.signoff.signatories} onAdd={addToList} onRemove={removeFromList} />
        <Input label="Sign-off Date" type="date" value={data.signoff.date} onChange={(v)=>setField(["signoff","date"], v)} />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="panel-title">{title}</div>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div className="form-control">
      <label className="label">{label}</label>
      <input className="input" type={type} value={value || ""} placeholder={placeholder} onChange={(e)=>onChange?.(e.target.value)} />
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div className="form-control" style={{ gridColumn: "1 / -1" }}>
      <label className="label">{label}</label>
      <textarea className="textarea" value={value || ""} onChange={(e)=>onChange?.(e.target.value)} placeholder="" />
    </div>
  );
}

function ListField({ title, path, items, onAdd, onRemove }) {
  return (
    <div className="form-control" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label className="label">{title}</label>
        <button className="btn" type="button" onClick={() => onAdd(path)}>Add</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {(items || []).map((it, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="input" style={{ flex: 1, background: "rgba(255,255,255,0.03)" }}>{String(it)}</div>
            <button className="btn" type="button" onClick={() => onRemove(path, idx)} title="Remove">✕</button>
          </div>
        ))}
        {(!items || items.length === 0) ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No items yet. Click Add to insert.</div>
        ) : null}
      </div>
    </div>
  );
}

function getPath(obj, path) {
  return path.reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setPath(obj, path, value) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (!(k in o)) o[k] = {};
    o = o[k];
  }
  o[path[path.length - 1]] = value;
}
function splitCsv(s) {
  return String(s || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Dynamic field renderer for template-driven inputs
 */
function DynamicTemplateField({ field, value, onChange }) {
  const common = { label: field.label || field.key };

  // Conditional display if dependsOn exists: this requires broader context;
  // As a simple approach, render anyway — integration can enforce conditions upstream.
  switch (field.type) {
    case "text":
    case "email":
    case "currency":
      return <Input {...common} value={value || ""} onChange={onChange} />;
    case "date":
      return <Input {...common} type="date" value={value || ""} onChange={onChange} />;
    case "textarea":
      return <Field {...common} value={value || ""} onChange={onChange} />;
    case "select":
      return (
        <div className="form-control">
          <label className="label">{common.label}</label>
          <select className="select" value={value || ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select...</option>
            {(field.options || []).map((opt) => (
              <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
            ))}
          </select>
        </div>
      );
    case "list":
      return (
        <div className="form-control" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="label">{common.label}</label>
            <button className="btn" type="button" onClick={() => onChange([...(value || []), prompt("Add item:") || ""].filter(Boolean))}>Add</button>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {(value || []).map((it, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div className="input" style={{ flex: 1, background: "rgba(255,255,255,0.03)" }}>{String(it)}</div>
                <button className="btn" type="button" onClick={() => onChange((value || []).filter((_, i) => i !== idx))} title="Remove">✕</button>
              </div>
            ))}
            {!value || (value || []).length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No items yet. Click Add to insert.</div>
            ) : null}
          </div>
        </div>
      );
    case "checkbox":
      return (
        <div className="form-control">
          <label className="label">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            {common.label}
          </label>
        </div>
      );
    case "object":
      return (
        <div className="form-control" style={{ gridColumn: "1 / -1" }}>
          <label className="label">{common.label}</label>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {(field.properties || []).map((p) => (
              <DynamicTemplateField
                key={p.key}
                field={p}
                value={(value || {})[p.key]}
                onChange={(v) => onChange({ ...(value || {}), [p.key]: v })}
              />
            ))}
          </div>
        </div>
      );
    case "table":
      return <DynamicTableField field={field} rows={value || []} onChange={onChange} />;
    case "upload-list":
      return (
        <div className="form-control" style={{ gridColumn: "1 / -1" }}>
          <label className="label">{common.label}</label>
          <input type="file" accept={field.accept || "*/*"} multiple onChange={(e) => handleFilesToDataURLs(e, (arr) => onChange([...(value || []), ...arr]))} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {(value || []).map((src, i) => (
              <img key={i} src={src} alt={`upload-${i}`} style={{ maxHeight: 60, border: "1px solid var(--ui-border)", borderRadius: 6 }} />
            ))}
          </div>
        </div>
      );
    default:
      return <Input {...common} value={value || ""} onChange={onChange} />;
  }
}

function DynamicTableField({ field, rows, onChange }) {
  const cols = field.columns || [];
  const addRow = () => {
    const empty = {};
    cols.forEach((c) => (empty[c.key] = ""));
    onChange([...(rows || []), empty]);
  };
  const setCell = (rIdx, key, val) => {
    const next = rows.map((r, i) => (i === rIdx ? { ...r, [key]: val } : r));
    onChange(next);
  };
  const delRow = (rIdx) => {
    onChange(rows.filter((_, i) => i !== rIdx));
  };
  return (
    <div className="form-control" style={{ gridColumn: "1 / -1" }}>
      <label className="label">{field.label || field.key}</label>
      <div style={{ overflowX: "auto", border: "1px solid var(--ui-border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid var(--ui-border)" }}>{c.label}</th>
              ))}
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.key} style={{ padding: 6, borderBottom: "1px solid var(--ui-border)" }}>
                    {c.type === "date" ? (
                      <input className="input" type="date" value={row[c.key] || ""} onChange={(e) => setCell(i, c.key, e.target.value)} />
                    ) : (
                      <input className="input" value={row[c.key] || ""} onChange={(e) => setCell(i, c.key, e.target.value)} />
                    )}
                  </td>
                ))}
                <td style={{ textAlign: "right" }}>
                  <button className="btn" type="button" onClick={() => delRow(i)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="btn" type="button" onClick={addRow}>Add Row</button>
      </div>
    </div>
  );
}

function handleFilesToDataURLs(e, cb) {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  const readers = [];
  const out = [];
  files.forEach((file, idx) => {
    const reader = new FileReader();
    readers.push(reader);
    reader.onload = () => {
      out[idx] = reader.result;
      if (out.filter(Boolean).length === files.length) cb(out);
    };
    reader.readAsDataURL(file);
  });
}
