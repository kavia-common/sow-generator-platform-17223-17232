import React from "react";
import "../theme.css";

// PUBLIC_INTERFACE
export default function SideNav({ current, onNavigate }) {
  /** Side navigation with SOW actions only (Templates removed) */
  const items = [
    { id: "template", label: "Template Select" },
    { id: "sowform", label: "SOW Form" },
    { id: "preview_auto", label: "Generate DOCX" },
  ];

  return (
    <aside className="sidebar" aria-label="SOW Actions">
      <div className="nav-group">
        <div className="nav-title">Actions</div>
        {items.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={`nav-item outline`}
              aria-current={active ? "page" : undefined}
              style={
                active
                  ? {
                      borderColor: "rgba(244, 114, 182, 0.8)",
                      background: "rgba(244, 114, 182, 0.10)",
                      boxShadow: "0 0 0 3px rgba(244,114,182,0.18)",
                      color: "var(--color-text)"
                    }
                  : undefined
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
