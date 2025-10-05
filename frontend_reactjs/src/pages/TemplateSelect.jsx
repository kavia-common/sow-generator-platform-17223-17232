import React from "react";

/**
 * PUBLIC_INTERFACE
 * TemplateSelect
 * Minimal chooser for Statement of Work type: Fixed Price (FP) or Time & Materials (TM).
 * No upload or external selection is supported; the app uses internal templates.
 */
export default function TemplateSelect({ selected, onChange }) {
  const opts = [
    { id: "FP", title: "Fixed Price (FP)", desc: "Uses the internal Fixed Price SOW template." },
    { id: "TM", title: "Time & Material (T&M)", desc: "Uses the internal T&M SOW template." },
  ];

  return (
    <div className="panel sow-dark" style={{ background: "#0b0b0b", borderColor: "var(--ui-border-strong)" }}>
      <div className="panel-title" style={{ color: "#f5f7fa", borderLeftColor: "#60a5fa" }}>SOW Type</div>
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
                borderColor: active ? "#60a5fa" : "var(--ui-border)",
                background: active ? "rgba(96,165,250,0.14)" : "rgba(255,255,255,0.03)",
                boxShadow: active ? "0 0 24px rgba(96,165,250,0.35)" : "none",
                textAlign: "left",
                color: "var(--text-primary)",
                backdropFilter: "blur(4px)"
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
