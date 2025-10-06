import React, { useCallback, useRef, useState } from "react";
import "../theme.css";
import "../styles.css";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Renders a pink-themed Generate DOCX button and triggers generation only on click.
 *
 * Props:
 * - data: object                // full SOW data
 * - templateSchema: object      // schema for All Entered Fields enumeration in builder
 */
export default function DocxPreviewAndGenerate({ data, templateSchema }) {
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
      <div className="panel-title" style={{ color: "var(--color-text)", borderLeftColor: "var(--color-primary)" }}>
        Generate DOCX
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onGenerate}
          title="Generate a new DOCX directly from your entries"
          disabled={generating}
          aria-busy={generating}
        >
          {generating ? "Generating..." : "Generate DOCX"}
        </button>
        <div className="text-muted">
          Export triggers only on click. There is no auto-download on mount.
        </div>
      </div>
    </div>
  );
}
