import React, { useCallback, useEffect, useRef, useState } from "react";
import "../theme.css";
import "../styles.css";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Builds a fresh, valid DOCX directly from SOW form values without using external templates.
 */
export default function DocxPreviewAndGenerate({ data, templateSchema, autoGenerate = false }) {
  const [generating, setGenerating] = useState(false);
  const rafRevokeRef = useRef(null);

  const onGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const { buildSowDocx, makeSowDocxFilename } = await import("../services/sowDocxBuilder.js");
      const blob = await buildSowDocx(data || {}, templateSchema || { fields: [] });
      const name = makeSowDocxFilename(data || {});
      triggerDownload(blob, name);
    } finally {
      setTimeout(() => setGenerating(false), 300);
    }
  }, [data, templateSchema, generating]);

  useEffect(() => {
    if (autoGenerate) onGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate]);

  function triggerDownload(blob, filename) {
    if (rafRevokeRef.current) {
      cancelAnimationFrame(rafRevokeRef.current);
      rafRevokeRef.current = null;
    }
    const link = document.createElement("a");
    const href = URL.createObjectURL(blob);
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    rafRevokeRef.current = requestAnimationFrame(() => {
      URL.revokeObjectURL(href);
      link.remove();
      rafRevokeRef.current = null;
    });
  }

  return (
    <div className="panel sow-dark" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div className="panel-title" style={{ color: "var(--color-text)", borderLeftColor: "var(--color-primary)" }}>Generate DOCX</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onGenerate}
          title="Generate a new DOCX directly from your entries"
          disabled={generating}
          aria-busy={generating}
          style={{}}
        >
          {generating ? "Generating..." : "Generate DOCX"}
        </button>
        <div className="text-muted">
          Generates a clean DOCX from your SOW entries. No templates are used.
        </div>
      </div>
    </div>
  );
}
