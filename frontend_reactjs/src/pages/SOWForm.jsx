import React, { useEffect, useMemo, useRef, useState } from "react";
import tmParsed from "../templates/parsed/tm_template_parsed.json";
import fpParsed from "../templates/parsed/fixed_price_template_parsed.json";
/**
 * Apply the previous black theme styling for the SOW form only.
 * Ensure no 'elegant' or ocean pastel theme classes are used here.
 */
import "./SOWForm.dark.css";

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
      meta: {
        logoUrl: "",
        logoName: "",
        logoFile: null,
        signaturePreview: {},
        signatureNames: {},
        signatureFiles: {},
        fileErrors: {}, // { logo?: string, [signatureKey]: string }
      },
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

  // Cleanup object URLs on unmount and on change
  const objectUrlsRef = useRef(new Set());
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current.clear();
    };
  }, []);

  // Sync down from parent when value reference changes
  const lastValueRef = useRef(value);
  useEffect(() => {
    if (value && value !== lastValueRef.current) {
      lastValueRef.current = value;
      setData({
        ...value,
        meta: {
          ...(value.meta || {}),
          signaturePreview: value.meta?.signaturePreview || {},
          signatureNames: value.meta?.signatureNames || {},
          signatureFiles: value.meta?.signatureFiles || {},
          fileErrors: value.meta?.fileErrors || {}
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
      const lbl = (f.label || f.name || f.key || "").toLowerCase().trim();
      // Remove any Work Order related fields/sections, including "Work Order Parameters"
      if (lbl === "work order parameters") return false;
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
  const fieldConfig = useMemo(() => {
    const cfg = [];
    (sections || []).forEach((sec) => {
      if (sec.section) {
        cfg.push({ kind: "section", id: sec.section, label: sec.section });
      }
      (sec.fields || []).forEach((f) => {
        if (f.type === "object" && Array.isArray(f.properties)) {
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

  // Centralized file handler
  // PUBLIC_INTERFACE
  async function handleFile(e, kindKey) {
    /** Handle logo or signature file selection/drop:
     * - Read first file
     * - Validate image type
     * - Create preview URL and store File + preview
     * - Revoke old URLs to avoid leaks
     */
    const file = e?.target?.files?.[0] || e?.dataTransfer?.files?.[0] || null;
    setData((prev) => {
      const next = structuredClone(prev || {});
      // clear error for this kindKey
      next.meta = next.meta || {};
      next.meta.fileErrors = { ...(next.meta.fileErrors || {}), [kindKey]: "" };
      // If nothing selected, clear state for that key
      if (!file) {
        if (kindKey === "logo") {
          // Revoke old URL if any
          if (next.meta.logoUrl && next.meta.logoUrl.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(next.meta.logoUrl);
            } catch {}
          }
          next.meta.logoUrl = "";
          next.meta.logoName = "";
          next.meta.logoFile = null;
        } else {
          // signature key is dotted or direct
          const sigKey = kindKey;
          const prevUrl = next.meta.signaturePreview?.[sigKey];
          if (prevUrl && String(prevUrl).startsWith("blob:")) {
            try {
              URL.revokeObjectURL(prevUrl);
            } catch {}
          }
          next.meta.signaturePreview = { ...(next.meta.signaturePreview || {}), [sigKey]: "" };
          next.meta.signatureNames = { ...(next.meta.signatureNames || {}), [sigKey]: "" };
          next.meta.signatureFiles = { ...(next.meta.signatureFiles || {}), [sigKey]: null };
          if (!next.templateData) next.templateData = {};
          setByKey(next.templateData, sigKey, null);
        }
        return next;
      }

      // Validate type
      const type = (file.type || "").toLowerCase();
      if (!type.startsWith("image/")) {
        next.meta.fileErrors = {
          ...(next.meta.fileErrors || {}),
          [kindKey]: "Please select a valid image file."
        };
        return next;
      }

      // Create URL and persist
      const objUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(objUrl);

      if (kindKey === "logo") {
        // Revoke old if switching
        if (next.meta.logoUrl && next.meta.logoUrl.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(next.meta.logoUrl);
          } catch {}
        }
        next.meta.logoUrl = objUrl;
        next.meta.logoName = file.name;
        next.meta.logoFile = file;
      } else {
        const sigKey = kindKey;
        const prevUrl = next.meta.signaturePreview?.[sigKey];
        if (prevUrl && String(prevUrl).startsWith("blob:")) {
          try {
            URL.revokeObjectURL(prevUrl);
          } catch {}
        }
        next.meta.signaturePreview = { ...(next.meta.signaturePreview || {}), [sigKey]: objUrl };
        next.meta.signatureNames = { ...(next.meta.signatureNames || {}), [sigKey]: file.name };
        next.meta.signatureFiles = { ...(next.meta.signatureFiles || {}), [sigKey]: file };
        if (!next.templateData) next.templateData = {};
        setByKey(next.templateData, sigKey, file);
      }
      return next;
    });
  }

  // Optional Supabase storage upload on submit/save
  async function uploadAssetsIfConfigured(userId) {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.REACT_APP_SUPABASE_KEY;
    if (!url || !key) return { logoPublicUrl: null, signaturePublicUrls: {} }; // preview-only mode

    // Lazy import our client which wraps createClient (already in repo)
    const { supabase } = await import("../supabaseClient.js");
    const bucket = "assets";
    const signaturePublicUrls = {};
    let logoPublicUrl = null;

    // Ensure bucket exists (ignore error if exists)
    try {
      await supabase.storage.createBucket(bucket, { public: true });
    } catch {
      // ignore
    }

    // Helper: upload a File and return public URL
    async function putAndGetPublicUrl(file, path) {
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data?.publicUrl || null;
    }

    const uid = userId || "anon";
    const now = Date.now();

    // Upload logo if present
    const logoFile = data?.meta?.logoFile;
    if (logoFile) {
      try {
        const path = `${uid}/${now}_logo_${logoFile.name}`;
        logoPublicUrl = await putAndGetPublicUrl(logoFile, path);
      } catch (e) {
        setData((prev) => {
          const next = structuredClone(prev || {});
          next.meta = next.meta || {};
          next.meta.fileErrors = { ...(next.meta.fileErrors || {}), logo: "Logo upload failed. You can proceed without upload." };
          return next;
        });
      }
    }

    // Upload signatures if present
    const sigFiles = data?.meta?.signatureFiles || {};
    const keys = Object.keys(sigFiles || {});
    for (const k of keys) {
      const f = sigFiles[k];
      if (!f) continue;
      try {
        const path = `${uid}/${now}_${k.replaceAll(".", "_")}_${f.name}`;
        const publicUrl = await putAndGetPublicUrl(f, path);
        signaturePublicUrls[k] = publicUrl;
      } catch (e) {
        setData((prev) => {
          const next = structuredClone(prev || {});
          next.meta = next.meta || {};
          next.meta.fileErrors = { ...(next.meta.fileErrors || {}), [k]: "Upload failed. You can proceed without upload." };
          return next;
        });
      }
    }

    return { logoPublicUrl, signaturePublicUrls };
  }

  // Drag and drop prevention at container level
  const brandingDropRef = useRef(null);
  useEffect(() => {
    const el = brandingDropRef.current;
    if (!el) return;
    const prevent = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    const onDrop = (ev) => {
      prevent(ev);
      if (ev.dataTransfer?.files?.length) {
        handleFile(ev, "logo");
      }
    };
    el.addEventListener("dragover", prevent);
    el.addEventListener("dragenter", prevent);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("dragenter", prevent);
      el.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandingDropRef.current]);

  // Basic required validation (skip work order, which is filtered out)
  const [errors, setErrors] = useState({});
  const validate = () => {
    const err = {};
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
    <div className="panel sow-form sow-dark">
      <div className="panel-title">SOW Form</div>

      {/* Meta: Logo upload (outside of two-column table) */}
      <div className="sow-table" style={{ marginBottom: 12 }}>
        <div className="sow-section" role="heading" aria-level={2}>Branding</div>
        <div className="sow-row">
          <div className="sow-cell sow-label">
            <label htmlFor="logo-upload-input">Logo Upload</label>
          </div>
          <div
            ref={brandingDropRef}
            className="sow-cell sow-input file-input"
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFile(e, "logo"); }}
          >
            <button
              className="btn"
              type="button"
              onClick={() => document.getElementById("logo-upload-input")?.click()}
            >
              Choose Logo
            </button>
            <input
              id="logo-upload-input"
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e, "logo")}
              style={{ display: "none" }}
              aria-invalid={!!data?.meta?.fileErrors?.logo}
              aria-describedby={data?.meta?.fileErrors?.logo ? "err-logo" : undefined}
            />
            <div style={{ color: "var(--text-secondary)" }}>{data?.meta?.logoName || "No file selected"}</div>
            {data?.meta?.logoUrl ? (
              <img
                alt="Company logo"
                src={data.meta.logoUrl}
                style={{ maxHeight: 80, maxWidth: 180, borderRadius: 8, border: "1px solid var(--ui-border)" }}
              />
            ) : null}
            {data?.meta?.fileErrors?.logo ? (
              <div id="err-logo" className="field-error" role="alert">{data.meta.fileErrors.logo}</div>
            ) : null}
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
                    <div className="file-input" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                      onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); handleFile(e, entry.key); }}
                    >
                      <button
                        className="btn"
                        type="button"
                        onClick={() => document.getElementById(`f-${entry.key}`)?.click()}
                        aria-label={`Choose image for ${entry.name}`}
                      >
                        Choose Signature
                      </button>
                      <input
                        id={`f-${entry.key}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFile(e, entry.key)}
                        style={{ display: "none" }}
                        aria-invalid={!!data?.meta?.fileErrors?.[entry.key] || !!errorMsg}
                        aria-describedby={
                          data?.meta?.fileErrors?.[entry.key] ? `err-${entry.key}-file` : (errorMsg ? `err-${entry.key}` : undefined)
                        }
                      />
                      <div style={{ color: "var(--text-secondary)" }}>
                        {data?.meta?.signatureNames?.[entry.key] || "No file selected"}
                      </div>
                      {data?.meta?.signaturePreview?.[entry.key] ? (
                        <img
                          alt={`${entry.name} preview`}
                          src={data.meta.signaturePreview[entry.key]}
                          style={{ maxHeight: 80, maxWidth: 180, borderRadius: 8, border: "1px solid var(--ui-border)" }}
                        />
                      ) : null}
                      {data?.meta?.fileErrors?.[entry.key] ? (
                        <div id={`err-${entry.key}-file`} className="field-error" role="alert">
                          {data.meta.fileErrors[entry.key]}
                        </div>
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
          className="btn"
          type="button"
          onClick={async () => {
            // Runs validation and optionally uploads to Supabase. Non-blocking on upload errors.
            if (!validate()) return;
            // Optional: replace local preview URLs with public URLs if available
            const { logoPublicUrl, signaturePublicUrls } = await uploadAssetsIfConfigured(data?.meta?.userId);
            if (logoPublicUrl) {
              setData((prev) => {
                const next = structuredClone(prev || {});
                next.meta = next.meta || {};
                next.meta.logoUrl = logoPublicUrl; // keep public URL
                return next;
              });
            }
            if (signaturePublicUrls && Object.keys(signaturePublicUrls).length > 0) {
              setData((prev) => {
                const next = structuredClone(prev || {});
                Object.entries(signaturePublicUrls).forEach(([k, url]) => {
                  if (!next.templateData) next.templateData = {};
                  setByKey(next.templateData, k, url); // store URL instead of File for downstream usage
                  next.meta = next.meta || {};
                  next.meta.signaturePreview = { ...(next.meta.signaturePreview || {}), [k]: url };
                });
                return next;
              });
            }
            // Dispatch save event (other parts of app might listen)
            const evt = new CustomEvent("sow:save", { detail: { source: "SOWForm" } });
            window.dispatchEvent(evt);
          }}
          title="Save form data"
        >
          Save
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={async () => {
            if (!validate()) return;
            // On submit/generate, attempt upload if configured but do not block generation if it fails.
            const { logoPublicUrl, signaturePublicUrls } = await uploadAssetsIfConfigured(data?.meta?.userId);
            if (logoPublicUrl || (signaturePublicUrls && Object.keys(signaturePublicUrls).length)) {
              setData((prev) => {
                const next = structuredClone(prev || {});
                if (logoPublicUrl) {
                  next.meta = next.meta || {};
                  next.meta.logoUrl = logoPublicUrl;
                }
                Object.entries(signaturePublicUrls || {}).forEach(([k, url]) => {
                  if (!next.templateData) next.templateData = {};
                  setByKey(next.templateData, k, url);
                  next.meta = next.meta || {};
                  next.meta.signaturePreview = { ...(next.meta.signaturePreview || {}), [k]: url };
                });
                return next;
              });
            }
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
