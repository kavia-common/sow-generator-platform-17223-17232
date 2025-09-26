import React, { useEffect, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * TemplateSelect
 * Enhanced to list all available templates (including drafts),
 * allow preview in a modal, and select the template.
 */
export default function TemplateSelect({ selected, onChange }) {
  const [all, setAll] = useState([]);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let mounted = true;
    import("../templates").then((m) => {
      if (!mounted) return;
      setAll(m.listAllTemplates());
    });
    return () => { mounted = false; };
  }, []);

  const openPreview = async (id) => {
    const m = await import("../templates");
    setPreview(m.getSOWTemplateSchema(id));
  };

  return (
    <div className="panel">
      <div className="panel-title">Choose Template</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {all.map((t) => {
          const active = selected === t.id;
          return (
            <div
              key={t.id}
              className="panel"
              style={{
                borderStyle: "solid",
                borderColor: active ? "var(--accent-purple)" : "var(--ui-border)",
                background: active ? "rgba(111,63,255,0.12)" : "rgba(255,255,255,0.03)",
                boxShadow: active ? "var(--glow-purple)" : "none"
              }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                  {t.title} {t.isDraft ? <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}> (Draft)</span> : null}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button className="btn" type="button" onClick={() => onChange(t.id)} aria-pressed={active}>
                    Select
                  </button>
                  <button className="btn" type="button" onClick={() => openPreview(t.id)}>
                    Preview
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {preview ? (
        <div role="dialog" aria-modal="true" aria-label="Template Preview" style={{position:"fixed", inset:0, display:"grid", placeItems:"center", background:"rgba(0,0,0,0.5)", zIndex:60}}>
          <div className="panel" style={{ width: "min(720px, 92vw)", maxHeight: "80vh", overflow: "auto" }}>
            <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems:"center" }}>
              <span>{preview.title}</span>
              <button className="btn" type="button" onClick={() => setPreview(null)}>Close</button>
            </div>
            <div style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
              Field list:
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {(preview.fields || []).map((f) => (
                <div key={f.key} style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dashed var(--ui-border)", padding:"4px 0" }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{f.label || f.key}</div>
                  <div style={{ color: "var(--text-secondary)" }}>{f.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
