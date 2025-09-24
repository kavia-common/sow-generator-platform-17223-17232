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
                boxShadow: active ? "var(--glow-purple)" : "none"
              }}
              aria-pressed={active}
            >
              <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text-primary)" }}>{o.title}</div>
              <div style={{ color: "var(--text-secondary)" }}>{o.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
