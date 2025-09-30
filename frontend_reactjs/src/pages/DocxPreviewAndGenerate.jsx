import React, { useCallback } from "react";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Generates a .docx using the internal bundled .docx by SOW type; if missing, falls back to transcript-rendered .docx.
 * Placeholders are replaced with provided values; unfilled remain unchanged.
 *
 * Props:
 * - data: { meta?: { client?: string, title?: string, sowType?: "TM"|"FP", templateDocxUrl?: string, logoUrl?: string }, templateData?: Record<string, any> }
 */
export default function DocxPreviewAndGenerate({ data }) {
  const onGenerate = useCallback(async () => {
    try {
      const { loadDocxArrayBuffer, prepareTemplateData, mergeDocxWithData } = await import("../services/docxInPlaceTemplateMergeService.js");
      const { ensureSampleDocxIfMissing, getBundledTemplateInfoByType } = await import("../services/bundledTemplates.js");

      // Determine SOW type explicitly from App state/meta
      const sowType = (data?.meta?.sowType === "FP" || data?.meta?.sowType === "TM") ? data.meta.sowType : "FP";
      const bundle = getBundledTemplateInfoByType(sowType);

      // Probe for bundled .docx, or build fallback from transcript
      const probe = await ensureSampleDocxIfMissing(sowType, data);
      if (probe && probe.ok && probe.kind === "fallback" && probe.blob) {
        const name = `SOW_${(data?.meta?.client || "Client").replace(/[^\w-]+/g, "_")}_${(data?.meta?.title || "Project").replace(/[^\w-]+/g, "_")}.docx`;
        triggerDownload(probe.blob, name);
        return;
      }

      const templateDocxUrl = (probe && probe.ok && probe.url) || bundle?.docxUrl || data?.meta?.templateDocxUrl || null;
      if (!templateDocxUrl) {
        alert("No bundled .docx available for the selected type. Please contact support.");
        return;
      }

      const ab = await loadDocxArrayBuffer(templateDocxUrl);
      const dataMap = prepareTemplateData(data?.templateData || {}, { logoDataUrl: data?.meta?.logoUrl });
      const blob = mergeDocxWithData(ab, dataMap, { keepUnfilledTags: true });

      const name = `SOW_${(data?.meta?.client || "Client").replace(/[^\w-]+/g, "_")}_${(data?.meta?.title || "Project").replace(/[^\w-]+/g, "_")}.docx`;
      triggerDownload(blob, name);
    } catch (e) {
      const msg = String(e?.message || e || "");
      if (msg.includes("end of central directory") || msg.toLowerCase().includes("zip")) {
        alert("Failed to generate DOCX: The internal template file is not a valid DOCX (zip) package.");
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
          onClick={onGenerate}
          title="Generate DOCX using the internal template for your selected SOW type"
        >
          Generate DOCX
        </button>
        <div style={{ color: "var(--text-secondary)" }}>
          Uses the internal {data?.meta?.sowType === "TM" ? "T&M" : "Fixed Price"} template. Your inputs and images (logo/signature) are merged into the document.
        </div>
      </div>
    </div>
  );
}
