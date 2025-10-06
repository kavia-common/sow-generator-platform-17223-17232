import React from "react";

// PUBLIC_INTERFACE
export default function SideNav({ current, onNavigate }) {
  /** Side navigation with SOW actions and steps */
  const items = [
    { id: "template", label: "Template Select" },
    { id: "sowform", label: "SOW Form" },
    { id: "preview", label: "Generate DOCX" },
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
              className="nav-item"
              aria-current={active ? "page" : undefined}
              style={
                active
                  ? {
                      borderColor: "var(--accent-purple)",
                      background: "#F9FAFB",
                      boxShadow: "0 0 0 3px rgba(139,92,246,0.15)"
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
