import React, { useCallback } from "react";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Strict export: Generates a .docx using ONLY the uploaded .docx template as the base.
 * No overlays, no generic sections, and no added/default content. Only in-place replacement
 * of placeholders with user data. Unused placeholders remain as-is.
 *
 * Props:
 * - data: { meta?: { templateDocxUrl?: string, client?: string, title?: string }, templateData?: Record<string, any> }
 */
export default function DocxPreviewAndGenerate({ data }) {
  const onGenerateExact = useCallback(async () => {
    try {
      const { loadDocxArrayBuffer, prepareTemplateData, mergeDocxWithData } = await import("../services/docxInPlaceTemplateMergeService.js");

      // Enforce: require the actual uploaded DOCX template URL
      const templateDocxUrl = data?.meta?.templateDocxUrl || null;
      if (!templateDocxUrl) {
        alert("No DOCX template file available. Please upload or provide meta.templateDocxUrl to export.");
        return;
      }

      const ab = await loadDocxArrayBuffer(templateDocxUrl);

      // Only user-entered values. No defaults. Prepare mapping and merge.
      const dataMap = prepareTemplateData(data?.templateData || {});
      const blob = mergeDocxWithData(ab, dataMap, {
        // keepUnfilledTags=true => placeholders without values remain unchanged in the document.
        keepUnfilledTags: true
      });

      const name = `SOW_${(data?.meta?.client || "Client").replace(/[^\w-]+/g, "_")}_${(data?.meta?.title || "Project").replace(/[^\w-]+/g, "_")}.docx`;
      triggerDownload(blob, name);
    } catch (e) {
      alert(`Failed to generate DOCX from template: ${e?.message || e}`);
    }
  }, [data]);

  function triggerDownload(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    requestAnimationFrame(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    });
  }

  return (
    <div className="panel">
      <div className="panel-title">Generate DOCX</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button className="btn btn-primary" type="button" onClick={onGenerateExact}>
          Generate DOCX (Exact Uploaded Template)
        </button>
        <div style={{ color: "var(--text-secondary)" }}>
          Uses only your uploaded template file. Only your entered values replace placeholders. Nothing else is added.
        </div>
      </div>
    </div>
  );
}
