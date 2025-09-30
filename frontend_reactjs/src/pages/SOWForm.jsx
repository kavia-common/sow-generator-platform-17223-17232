import React, { useEffect, useMemo, useRef, useState } from "react";
import tmParsed from "../templates/parsed/tm_template_parsed.json";
import fpParsed from "../templates/parsed/fixed_price_template_parsed.json";

/**
 * PUBLIC_INTERFACE
 * SOWForm
 * Renders ONLY template-driven fields, dynamically grouped by sections, based on the selected template.
 * Supports single-line, multi-line, object groups, lists, tables, checkboxes, uploads, and signatures.
 *
 * Props:
 * - value: current SOW JSON { meta?, templateMeta?, templateData? }
 * - onChange: (next) => void
 * - selectedTemplate: "TM" | "FP"
 * - templateSchema: Optional external schema; if not provided, we use parsed JSONs for the chosen template
 */
export default function SOWForm({ value, onChange, selectedTemplate, templateSchema }) {
  const [data, setData] = useState(
    value || {
      meta: {
        // Keep only minimal non-template meta needed in UI (logo for preview/export)
        logoUrl: "",
        logoName: ""
      },
      templateMeta: value?.templateMeta || null,
      templateData: value?.templateData || {}
    }
  );

  // Emit updates upward
  useEffect(() => {
    onChange?.(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Sync from parent
  useEffect(() => {
    if (value) setData(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Resolve sections/fields from parsed templates if templateSchema is not provided
  const activeParsed = useMemo(() => {
    if (templateSchema?.sections) return templateSchema; // already in grouped form
    if (selectedTemplate === "TM") return tmParsed?.parsed || null;
    if (selectedTemplate === "FP") return fpParsed?.parsed || null;
    return null;
  }, [templateSchema, selectedTemplate]);

  const sections = activeParsed?.sections || [];

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
        meta: { ...(prev.meta || {}), logoUrl: reader.result, logoName: file.name }
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
      <div className="panel-title">SOW Form</div>

      {/* Logo only (non-template meta retained) */}
      <div className="form-grid">
        <div className="form-control" style={{ gridColumn: "1 / -1" }}>
          <label className="label">Logo Upload</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => logoInputRef.current?.click()}>Choose Logo</button>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogoPick} style={{ display: "none" }} />
            <div style={{ color: "var(--text-secondary)" }}>{data?.meta?.logoName || "No file selected"}</div>
            {logoPreview}
          </div>
        </div>
      </div>

      {!sections.length ? (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-title">No template selected</div>
          <div style={{ color: "var(--text-secondary)" }}>
            Please select a template to display its fields. Choose "Fixed Price" or "T&M" in the Template step.
          </div>
        </div>
      ) : (
        sections.map((sec, idx) => (
          <Section key={idx} title={sec.section}>
            {(sec.fields || []).map((f) => (
              <DynamicTemplateField
                key={f.key}
                field={f}
                value={resolveValue(data?.templateData, f)}
                onChange={(v) => writeValue(f, v)}
              />
            ))}
          </Section>
        ))
      )}
    </div>
  );

  function resolveValue(root, field) {
    if (!root) return undefined;
    return root[field.key];
  }

  function writeValue(field, v) {
    setTemplateField([field.key], v);
  }
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

function Field({ label, value, onChange, rows = 5 }) {
  return (
    <div className="form-control" style={{ gridColumn: "1 / -1" }}>
      <label className="label">{label}</label>
      <textarea className="textarea" rows={rows} value={value || ""} onChange={(e)=>onChange?.(e.target.value)} placeholder="" />
    </div>
  );
}

/**
 * Dynamic field renderer strictly based on template fields.
 * Recognizes "signature" type from parsed JSONs and renders an image uploader.
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
      return <Field {...common} value={value || ""} onChange={onChange} rows={Math.max(5, (field.minRows || 0))} />;
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
        <ListEditor label={common.label} items={value || []} onChange={onChange} itemLabel={field.itemLabel} />
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
    case "signature":
      return (
        <SignatureUploadLabeled label={common.label} value={value} onChange={onChange} />
      );
    default:
      return <Input {...common} value={value || ""} onChange={onChange} />;
  }
}

function ListEditor({ label, items, onChange, itemLabel }) {
  return (
    <div className="form-control" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label className="label">{label}</label>
        <button
          className="btn"
          type="button"
          onClick={() => {
            const val = prompt(itemLabel || "Add item:");
            if (!val) return;
            onChange([...(items || []), val]);
          }}
        >
          Add
        </button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {(items || []).map((it, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="input" style={{ flex: 1, background: "rgba(255,255,255,0.03)" }}>{String(it)}</div>
            <button className="btn" type="button" onClick={() => onChange((items || []).filter((_, i) => i !== idx))} title="Remove">✕</button>
          </div>
        ))}
        {!items || (items || []).length === 0 ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No items yet. Click Add to insert.</div>
        ) : null}
      </div>
    </div>
  );
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
  const out = [];
  files.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = () => {
      out[idx] = reader.result;
      if (out.filter(Boolean).length === files.length) cb(out);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * PUBLIC_INTERFACE
 * SignatureUploadLabeled
 * Image uploader specialized for signatures used in authorization sections.
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

function setPath(obj, path, value) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (!(k in o)) o[k] = {};
    o = o[k];
  }
  o[path[path.length - 1]] = value;
}
