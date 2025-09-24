import React from "react";

// PUBLIC_INTERFACE
export default function ReviewEdit({ draft, onChange }) {
  /** Allow user editing of generated draft before finalization */
  return (
    <div className="panel">
      <div className="panel-title">Review & Edit</div>
      <textarea
        className="textarea"
        value={draft || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Your generated draft will appear here for editing..."
        style={{ minHeight: 280 }}
      />
    </div>
  );
}
