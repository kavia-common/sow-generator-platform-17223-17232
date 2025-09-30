import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * SOWForm
 * Interactive data collection strictly based on detected placeholders from the selected DOCX template
 * (via templateSchema fields). Includes logo upload and separate Supplier & Client signature fields.
 */
export default function SOWForm({ value, onChange, selectedTemplate, templateSchema }) {
  const [data, setData] = useState(
    value || {
      meta: {
        title: "",
        client: "",
        date: "",
        version: "",
        prepared_by: "",
        stakeholders: [],
        logoUrl: "",
        logoName: "",
        // backward-compat field
        signatureUrl: "",
        // explicit signature URLs
        supplierSignatureUrl: "",
        clientSignatureUrl: ""
      },
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

  const setField = (path, v) => {
    setData((prev) => {
      const next = structuredClone(prev);
      setPath(next, path, v);
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

  const logoPreview = useMemo(() => {
    const url = data?.meta?.logoUrl;
    if (!url) return null;
    return <img alt="Company logo" src={url} style={{ maxHeight: 56, maxWidth: 180, borderRadius: 8, border: "1px solid var(--ui-border)" }} />;
  }, [data?.meta?.logoUrl]);

  return (
    <div className="panel">
      <div className="panel-title">SOW Input — Only Template Fields</div>

      {/* Meta essentials and logo */}
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
      ) : (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-title">No template selected</div>
          <div style={{ color: "var(--text-secondary)" }}>Please select a template to display its fields.</div>
        </div>
      )}
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

/**
 * Dynamic field renderer strictly based on template fields.
 */
function DynamicTemplateField({ field, value, onChange }) {
  const common = { label: field.label || field.key };

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
            <button
              className="btn"
              type="button"
              onClick={() => {
                const val = prompt("Add item:");
                if (!val) return;
                onChange([...(value || []), val]);
              }}
            >
              Add
            </button>
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
    const next = (rows || []).map((r, i) => (i === rIdx ? { ...r, [key]: val } : r));
    onChange(next);
  };
  const delRow = (rIdx) => {
    onChange((rows || []).filter((_, i) => i !== rIdx));
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

/**
 * Labeled signature uploader (kept for compatibility in case schema wants image data via upload-list).
 */
function SignatureUploadLabeled({ label, value, onChange }) {
  const [name, setName] = useState("");
  const inputRef = useRef(null);
  return (
    <div className="form-control" style={{ gridColumn: "1 / -1" }}>
      <label className="label">{label}</label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" type="button" onClick={() => inputRef.current?.click()}>Choose Signature</button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              onChange?.(reader.result);
              setName(file.name);
            };
            reader.readAsDataURL(file);
          }}
        />
        <div style={{ color: "var(--text-secondary)" }}>{name || "No file selected"}</div>
        {value ? (
          <img alt="Signature preview" src={value} style={{ maxHeight: 64, background: "#fff", borderRadius: 6, border: "1px solid var(--ui-border)" }} />
        ) : null}
      </div>
    </div>
  );
}

function getPath(obj, path) {
  return path.reduce((o, k) => (o ? o[k] : undefined), obj || {});
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
