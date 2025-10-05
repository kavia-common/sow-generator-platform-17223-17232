import React, { useEffect, useMemo, useRef, useState } from "react";
import tmParsed from "../templates/parsed/tm_template_parsed.json";
import fpParsed from "../templates/parsed/fixed_price_template_parsed.json";

/**
 * PUBLIC_INTERFACE
 * SOWForm
 * Strict two-column SOW form with left labels and right inputs.
 * Renders each field exactly once via a configuration derived from the selected template schema.
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
      meta: { logoUrl: "", logoName: "", signaturePreview: {}, signatureNames: {} },
      templateMeta: value?.templateMeta || null,
      templateData: value?.templateData || {}
    }
  );

  // Emit updates upward (debounced)
  const emitTimer = useRef(null);
  useEffect(() => {
    if (!onChange) return;
    if (emitTimer.current) clearTimeout(emitTimer.current);
    emitTimer.current = setTimeout(() => onChange(data), 50);
    return () => emitTimer.current && clearTimeout(emitTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Sync down from parent when value reference changes
  const lastValueRef = useRef(value);
  useEffect(() => {
    if (value && value !== lastValueRef.current) {
      lastValueRef.current = value;
      // ensure meta sub-shape for new signature fields
      setData({
        ...value,
        meta: {
          ...(value.meta || {}),
          signaturePreview: value.meta?.signaturePreview || {},
          signatureNames: value.meta?.signatureNames || {}
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Resolve active parsed schema
  const activeParsed = useMemo(() => {
    if (templateSchema?.sections) return templateSchema; // already grouped
    if (selectedTemplate === "TM") return tmParsed?.parsed || null;
    if (selectedTemplate === "FP") return fpParsed?.parsed || null;
    return null;
  }, [templateSchema, selectedTemplate]);

  // Remove any Work Order keys/labels if present in future schemas
  const filterOutWorkOrder = (fields = []) =>
    fields.filter((f) => {
      const lbl = (f.label || f.name || f.key || "").toLowerCase();
      return !(lbl.includes("work order") || lbl.includes("work_order"));
    });

  const sectionsRaw = activeParsed?.sections || [];
  // normalize and filter out work order
  const sections = useMemo(() => {
    return (sectionsRaw || []).map((sec) => ({
      ...sec,
      fields: filterOutWorkOrder(sec.fields || [])
    }));
  }, [sectionsRaw]);

  // Build single-source field configuration for two-column renderer
  // This flattens objects and removes duplicate generic labels by scoping with parent label.
  const fieldConfig = useMemo(() => {
    const cfg = [];
    (sections || []).forEach((sec) => {
      if (sec.section) {
        cfg.push({ kind: "section", id: sec.section, label: sec.section });
      }
      (sec.fields || []).forEach((f) => {
        if (f.type === "object" && Array.isArray(f.properties)) {
          // Flatten object properties with qualified labels
          f.properties.forEach((p) => {
            cfg.push({
              kind: "field",
              key: `${f.key}.${p.key}`,
              name: `${f.label} — ${p.label}`,
              type: p.type || "text",
              options: p.options || []
            });
          });
        } else {
          cfg.push({
            kind: "field",
            key: f.key,
            name: f.label || f.key,
            type: f.type || "text",
            options: f.options || []
          });
        }
      });
    });
    // Ensure uniqueness by key (avoid duplicates on re-render)
    const seen = new Set();
    return cfg.filter((c) => {
      if (c.kind === "section") return true;
      if (seen.has(c.key)) return false;
      seen.add(c.key);
      return true;
    });
  }, [sections]);

  // Provide bundled template URL hint
  useEffect(() => {
    async function syncBundled() {
      const { getBundledTemplateInfoByType } = await import("../services/bundledTemplates.js");
      const info = getBundledTemplateInfoByType(selectedTemplate);
      setData((prev) => {
        const next = structuredClone(prev || {});
        next.meta = next.meta || {};
        next.meta.templateDocxUrl = info?.docxUrl || null;
        next.meta.sowType = selectedTemplate || null;
        next.templateMeta = { ...(next.templateMeta || {}), id: info?.id || selectedTemplate, title: info?.title || selectedTemplate };
        return next;
      });
    }
    if (selectedTemplate) syncBundled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  // Mutator for template fields
  const setTemplateField = (key, v) => {
    setData((prev) => {
      const next = structuredClone(prev || {});
      if (!next.templateData) next.templateData = {};
      if (String(key).includes(".")) {
        const parts = String(key).split(".");
        setPath(next.templateData, parts, v);
      } else {
        next.templateData[key] = v;
      }
      return next;
    });
  };

  // Logo upload (meta) — proper file input and preview URL
  const logoInputRef = useRef(null);
  const onLogoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setData((prev) => ({
      ...prev,
      meta: { ...(prev.meta || {}), logoUrl: localUrl, logoName: file.name, logoFile: file }
    }));
  };

  const logoPreview = useMemo(() => {
    const url = data?.meta?.logoUrl;
    if (!url) return null;
    return (
      <img
        alt="Company logo"
        src={url}
        style={{ maxHeight: 56, maxWidth: 180, borderRadius: 8, border: "1px solid var(--ui-border)" }}
      />
    );
  }, [data?.meta?.logoUrl]);

  // Signature upload(s) — handle fields of type 'signature'
  const signatureInputRefs = useRef({});
  const onSignaturePick = (fieldKey) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setData((prev) => {
      const next = structuredClone(prev || {});
      next.meta = next.meta || {};
      next.meta.signaturePreview = { ...(next.meta.signaturePreview || {}), [fieldKey]: localUrl };
      next.meta.signatureNames = { ...(next.meta.signatureNames || {}), [fieldKey]: file.name };
      // store the actual File in templateData under corresponding key so submission payload can carry it
      if (!next.templateData) next.templateData = {};
      setByKey(next.templateData, fieldKey, file);
      return next;
    });
  };

  // Basic required validation (skip work order, which is filtered out)
  const [errors, setErrors] = useState({});
  const validate = () => {
    const err = {};
    // Example required keys — can be extended based on template
    const requiredKeys = ["client_name", "supplier_name", "scope_of_work"];
    requiredKeys.forEach((k) => {
      const val = getValue(data?.templateData, k);
      if (!val) err[k] = "Required";
    });
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // Renderer
  return (
    <div className="panel">
      <div className="panel-title">SOW Form</div>

      {/* Meta: Logo upload (outside of two-column table) */}
      <div className="sow-table" style={{ marginBottom: 12 }}>
        <div className="sow-section" role="heading" aria-level={2}>Branding</div>
        <div className="sow-row">
          <div className="sow-cell sow-label">
            <label htmlFor="logo-upload-input">Logo Upload</label>
          </div>
          <div className="sow-cell sow-input" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={() => logoInputRef.current?.click()}>Choose Logo</button>
            <input
              id="logo-upload-input"
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={onLogoPick}
              style={{ display: "none" }}
            />
            <div style={{ color: "var(--text-secondary)" }}>{data?.meta?.logoName || "No file selected"}</div>
            {logoPreview}
          </div>
        </div>
      </div>

      {!sections.length ? (
        <div className="panel" style={{ marginTop: 12 }}>
          <div className="panel-title">No template selected</div>
          <div style={{ color: "var(--text-secondary)" }}>
            Please select a template to display its fields. Choose "Fixed Price" or "T&amp;M" in the Template step.
          </div>
        </div>
      ) : (
        <div className="sow-table">
          {fieldConfig.map((entry) => {
            if (entry.kind === "section") {
              return (
                <div key={`sec-${entry.id}`} className="sow-section" role="heading" aria-level={2}>
                  {entry.label}
                </div>
              );
            }
            const value = getValue(data?.templateData, entry.key);
            const errorMsg = errors[entry.key];
            return (
              <div key={entry.key} className="sow-row" aria-label={entry.name}>
                <div className="sow-cell sow-label">
                  <label htmlFor={`f-${entry.key}`}>{entry.name}</label>
                </div>
                <div className="sow-cell sow-input">
                  {entry.type === "signature" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => signatureInputRefs.current[entry.key]?.click()}
                      >
                        Choose Signature
                      </button>
                      <input
                        id={`f-${entry.key}`}
                        ref={(el) => (signatureInputRefs.current[entry.key] = el)}
                        type="file"
                        accept="image/*"
                        onChange={onSignaturePick(entry.key)}
                        style={{ display: "none" }}
                        aria-invalid={!!errorMsg}
                        aria-describedby={errorMsg ? `err-${entry.key}` : undefined}
                      />
                      <div style={{ color: "var(--text-secondary)" }}>
                        {data?.meta?.signatureNames?.[entry.key] || "No file selected"}
                      </div>
                      {data?.meta?.signaturePreview?.[entry.key] ? (
                        <img
                          alt={`${entry.name} preview`}
                          src={data.meta.signaturePreview[entry.key]}
                          style={{ maxHeight: 56, maxWidth: 180, borderRadius: 8, border: "1px solid var(--ui-border)" }}
                        />
                      ) : null}
                    </div>
                  ) : (
                    renderInput({ ...entry, error: errorMsg }, value, (v) => setTemplateField(entry.key, v))
                  )}
                  {errorMsg ? (
                    <div id={`err-${entry.key}`} className="field-error" role="alert" style={{ color: "var(--error-600)" }}>
                      {errorMsg}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            // run validation before dispatching generate
            if (!validate()) return;
            const evt = new CustomEvent("sow:request-generate-docx", { detail: { source: "SOWForm" } });
            window.dispatchEvent(evt);
          }}
          title="Generate your SOW as a DOCX"
          disabled={!selectedTemplate || !sections.length}
        >
          Generate DOCX
        </button>
        <div style={{ color: "var(--text-secondary)" }}>
          Creates a Word document directly from your entries.
        </div>
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * renderInput
 * Renders the appropriate input control for a configured field with strict left-label/right-input layout.
 */
function renderInput(field, value, onChange) {
  const id = `f-${field.key}`;
  const commonProps = {
    id,
    className: "input",
    "aria-invalid": !!field.error,
    "aria-describedby": field.error ? `err-${field.key}` : undefined
  };
  switch (field.type) {
    case "date":
      return <input {...commonProps} type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <select
          id={id}
          className="select"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!field.error}
          aria-describedby={field.error ? `err-${field.key}` : undefined}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
          ))}
        </select>
      );
    case "textarea":
      return (
        <textarea
          id={id}
          className="textarea sow-textarea"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder=""
          aria-invalid={!!field.error}
          aria-describedby={field.error ? `err-${field.key}` : undefined}
        />
      );
    case "checkbox":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={!!field.error}
            aria-describedby={field.error ? `err-${field.key}` : undefined}
          />
        </div>
      );
    case "currency":
    case "email":
    case "text":
    default:
      return <input {...commonProps} type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function getValue(root, key) {
  if (!root) return undefined;
  if (!String(key).includes(".")) return root[key];
  return String(key).split(".").reduce((o, k) => (o ? o[k] : undefined), root);
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

// set by dotted key helper used for signature file storage
function setByKey(root, dottedKey, v) {
  if (!root) return;
  if (!String(dottedKey).includes(".")) {
    root[dottedKey] = v;
    return;
    }
  const parts = String(dottedKey).split(".");
  setPath(root, parts, v);
}
