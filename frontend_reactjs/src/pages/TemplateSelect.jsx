import React from "react";

// PUBLIC_INTERFACE
export default function TemplateSelect({ selected, onChange }) {
  /** Choose SOW template between Fixed Price (FP) and Time & Material (T&M) */
  const opts = [
    { id: "FP", title: "Fixed Price (FP)", desc: "Defined scope, fixed budget and timeline." },
    { id: "TM", title: "Time & Material (T&M)", desc: "Flexible scope, billable hours and materials." },
  ];
  return (
    <div className="panel">
      <div className="panel-title">Choose Template</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1", color: "var(--text-secondary)", marginBottom: 4 }}>
          Selecting a template controls which SOW form fields you will see.
        </div>
        {opts.map((o) => {
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              className="panel"
              style={{
                borderStyle: "solid",
                borderColor: active ? "var(--accent-purple)" : "var(--ui-border)",
                background: active ? "rgba(111,63,255,0.12)" : "rgba(255,255,255,0.03)",
                boxShadow: active ? "var(--glow-purple)" : "none",
                textAlign: "left"
              }}
              aria-pressed={active}
            >
              <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text-primary)" }}>{o.title}</div>
              <div style={{ color: "var(--text-secondary)" }}>{o.desc}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="btn" style={{ pointerEvents: "none" }}>Preview above</span>
                <span className="btn" style={{ pointerEvents: "none" }}>Select to continue</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
