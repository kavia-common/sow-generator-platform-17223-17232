import React, { useState } from "react";

// PUBLIC_INTERFACE
export default function GenerateDraft({ company, project, template, onDraft }) {
  /** Draft generation step. In MVP we simulate AI response and allow preview */
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");

  const simulateGenerate = async () => {
    setLoading(true);
    // Here we would call backend/OpenAPI with details -> AI -> response
    const text = `SOW Draft
Company: ${company?.name || "N/A"}
Template: ${template || "N/A"}

Overview:
${project?.overview || "-"}

Scope:
${project?.scope || "-"}

Deliverables:
${project?.deliverables || "-"}

Roles:
${project?.roles || "-"}

Acceptance Criteria:
${project?.acceptance || "-"}

— End of Draft —`;
    await new Promise((r) => setTimeout(r, 600));
    setPreview(text);
    onDraft?.(text);
    setLoading(false);
  };

  return (
    <div className="panel">
      <div className="panel-title">Generate Draft</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <button className="btn btn-primary" onClick={simulateGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Draft"}
        </button>
        <span style={{ color: "var(--text-secondary)" }}>Uses AI and your selected template to produce a first draft.</span>
      </div>
      <div className="preview" aria-live="polite">
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--text-primary)" }}>{preview || "No draft yet."}</pre>
      </div>
    </div>
  );
}
