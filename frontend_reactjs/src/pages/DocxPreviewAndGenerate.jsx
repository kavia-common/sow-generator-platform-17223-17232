import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Builds a fresh, valid DOCX directly from SOW form values without using any external .docx templates.
 *
 * Props:
 * - data: { meta?: { client?: string, title?: string, sowType?: "TM"|"FP", logoUrl?: string }, templateData?: Record<string, any> }
 * - templateSchema?: sectioned or flat schema describing fields to list in the output
 * - autoGenerate?: boolean  If true, immediately trigger generation on mount/update (used for one-click submit).
 */
export default function DocxPreviewAndGenerate({ data, templateSchema, autoGenerate = false }) {
  const [generating, setGenerating] = useState(false);
  const rafRevokeRef = useRef(null);

  const onGenerate = useCallback(async () => {
    if (generating) return; // prevent duplicate clicks
    setGenerating(true);
    try {
      const { buildSowDocx, makeSowDocxFilename } = await import("../services/sowDocxBuilder.js");
      // Always pass templateSchema so the builder can enumerate all fields in schema order
      const blob = await buildSowDocx(data || {}, templateSchema || { fields: [] });
      const name = makeSowDocxFilename(data || {});
      triggerDownload(blob, name);
    } finally {
      // small delay to avoid immediate re-press while browser processes download
      setTimeout(() => setGenerating(false), 300);
    }
  }, [data, templateSchema, generating]);

  useEffect(() => {
    if (autoGenerate) {
      onGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate]);

  function triggerDownload(blob, filename) {
    // Ensure any prior URL is revoked before creating a new one
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
    <div className="panel">
      <div className="panel-title">Generate DOCX</div>
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
        <div style={{ color: "var(--text-secondary)" }}>
          Generates a clean DOCX from your SOW entries. No templates are used.
        </div>
      </div>
    </div>
  );
}
