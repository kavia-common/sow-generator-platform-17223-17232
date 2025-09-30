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
 * Notes:
 * - meta.templateDocxUrl is set upstream on template selection/upload. If missing, UI will prompt to select/assign.
 */
export default function DocxPreviewAndGenerate({ data }) {
  const onGenerateExact = useCallback(async () => {
    try {
      const { loadDocxArrayBuffer, prepareTemplateData, mergeDocxWithData } = await import("../services/docxInPlaceTemplateMergeService.js");

      // Enforce: require the actual uploaded DOCX template URL
      const templateDocxUrl = data?.meta?.templateDocxUrl || null;
      if (!templateDocxUrl) {
        alert("A DOCX template is required. Please upload or select the correct template file before generating.");
        return;
      }

      // Preempt common mis-uploads: if the URL ends with .txt, it's a transcript, not a .docx
      if ((templateDocxUrl || "").toLowerCase().endsWith(".txt")) {
        alert("The selected template is a .txt transcript, not a .docx. Please upload/select the original .docx template file.");
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
      const msg = String(e?.message || e || "");
      if (msg.includes("end of central directory") || msg.toLowerCase().includes("zip")) {
        alert("Failed to generate DOCX: The uploaded file is not a valid DOCX (zip) package. Please upload the original .docx template.");
      } else {
        alert(`Failed to generate DOCX from template: ${msg}`);
      }
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
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={onGenerateExact}
          disabled={!data?.meta?.templateDocxUrl}
          title={data?.meta?.templateDocxUrl ? "Generate DOCX" : "Attach or select a DOCX template to enable generation"}
        >
          Generate DOCX (Exact Uploaded Template)
        </button>
        <div style={{ color: "var(--text-secondary)" }}>
          Uses only your uploaded template file. Only your entered values replace placeholders. Nothing else is added.
        </div>
        {!data?.meta?.templateDocxUrl ? (
          <div style={{ color: "var(--error)", fontSize: 13 }}>
            No DOCX template selected. Please upload/select the correct template file to proceed.
          </div>
        ) : null}
      </div>
    </div>
  );
}
