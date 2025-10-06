import React from "react";
import "../theme.css";
import "../styles.css";

/**
 * PUBLIC_INTERFACE
 * TemplateSelect
 * Minimal chooser for Statement of Work type: Fixed Price (FP) or Time & Materials (TM).
 */
export default function TemplateSelect({ selected, onChange }) {
  const opts = [
    { id: "FP", title: "Fixed Price (FP)", desc: "Uses the internal Fixed Price SOW template." },
    { id: "TM", title: "Time & Material (T&M)", desc: "Uses the internal T&M SOW template." },
  ];

  return (
    <div className="panel">
      <div className="panel-title">SOW Type</div>
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
                borderColor: active ? "var(--color-border)" : "var(--color-border)",
                background: "var(--color-surface-2)",
                boxShadow: active ? "0 0 0 3px rgba(96,165,250,0.15)" : "var(--shadow-sm)",
                textAlign: "left",
                color: "var(--color-text)"
              }}
              aria-pressed={active}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{o.title}</div>
              <div className="text-muted">{o.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
