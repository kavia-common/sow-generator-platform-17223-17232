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
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="panel"
            style={{
              borderStyle: "solid",
              borderColor: selected === o.id ? "var(--ocn-primary)" : "rgba(55,65,81,0.08)",
              background: selected === o.id ? "#fff0f7" : "white"
            }}
            aria-pressed={selected === o.id}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{o.title}</div>
            <div style={{ color: "#6b7280" }}>{o.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
