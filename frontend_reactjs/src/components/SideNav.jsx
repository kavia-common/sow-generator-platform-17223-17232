import React from "react";

// PUBLIC_INTERFACE
export default function SideNav({ current, onNavigate }) {
  /** Side navigation with SOW actions and steps */
  const items = [
    { id: "company", label: "Company Details" },
    { id: "project", label: "Project Details" },
    { id: "template", label: "Choose Template (FP/T&M)" },
    { id: "generate", label: "Generate Draft" },
    { id: "review", label: "Review & Edit" },
    { id: "export", label: "Export PDF" },
  ];

  return (
    <aside className="sidebar" aria-label="SOW Actions">
      <div className="nav-group">
        <div className="nav-title">Actions</div>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className="nav-item"
            aria-current={current === item.id ? "page" : undefined}
            style={current === item.id ? { borderColor: "var(--ocn-primary)", background: "#fff0f7" } : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="nav-group">
        <div className="nav-title">Templates</div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="btn" style={{ cursor: "default" }}>FP</span>
          <span className="btn" style={{ cursor: "default" }}>T&M</span>
        </div>
      </div>
    </aside>
  );
}
