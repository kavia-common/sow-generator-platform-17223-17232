import React, { useCallback } from "react";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Generates a .docx using bundled .docx by SOW type; if missing, falls back to transcript-rendered .docx.
 * Placeholders are replaced with provided values; unfilled remain unchanged.
 *
 * Props:
 * - data: { meta?: { templateDocxUrl?: string, client?: string, title?: string, sowType?: "TM"|"FP" }, templateData?: Record<string, any> }
 */
export default function DocxPreviewAndGenerate({ data }) {
  const onGenerateExact = useCallback(async () => {
    try {
      const { loadDocxArrayBuffer, prepareTemplateData, mergeDocxWithData } = await import("../services/docxInPlaceTemplateMergeService.js");
      const { ensureSampleDocxIfMissing } = await import("../services/bundledTemplates.js");

      const sowType = data?.meta?.sowType || (data?.templateMeta?.id?.includes("TM") ? "TM" : data?.templateMeta?.id?.includes("FIXED") ? "FP" : null);

      // First, try to use bundled docx (or fallback to transcript-based docx if missing)
      const probe = await ensureSampleDocxIfMissing(sowType || (data?.meta?.templateDocxUrl ? null : null), data);
      if (probe && probe.ok && probe.kind === "fallback" && probe.blob) {
        const name = `SOW_${(data?.meta?.client || "Client").replace(/[^\w-]+/g, "_")}_${(data?.meta?.title || "Project").replace(/[^\w-]+/g, "_")}.docx`;
        triggerDownload(probe.blob, name);
        if (!data?.meta?.templateDocxUrl) {
          // notify user gently about fallback
          setTimeout(() => alert("Bundled .docx not found. Generated using transcript fallback."), 0);
        }
        return;
      }

      // If bundled is present, or meta.templateDocxUrl is set, then merge with docxtemplater
      const templateDocxUrl = (probe && probe.ok && probe.url) || data?.meta?.templateDocxUrl || null;
      if (!templateDocxUrl) {
        alert("No bundled .docx available for the selected type, and no .docx provided. Please contact support.");
        return;
      }
      const ab = await loadDocxArrayBuffer(templateDocxUrl);

      // Only user-entered values. No defaults. Prepare mapping and merge.
      const dataMap = prepareTemplateData(data?.templateData || {});
      const blob = mergeDocxWithData(ab, dataMap, {
        keepUnfilledTags: true
      });

      const name = `SOW_${(data?.meta?.client || "Client").replace(/[^\w-]+/g, "_")}_${(data?.meta?.title || "Project").replace(/[^\w-]+/g, "_")}.docx`;
      triggerDownload(blob, name);
    } catch (e) {
      const msg = String(e?.message || e || "");
      if (msg.includes("end of central directory") || msg.toLowerCase().includes("zip")) {
        alert("Failed to generate DOCX: The bundled/selected file is not a valid DOCX (zip) package.");
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
