import React, { useCallback, useEffect } from "react";

/**
 * PUBLIC_INTERFACE
 * DocxPreviewAndGenerate
 * Generates a .docx using the internal bundled .docx by SOW type; if missing, falls back to transcript-rendered .docx.
 * Placeholders are replaced with provided values; unfilled remain unchanged.
 *
 * Props:
 * - data: { meta?: { client?: string, title?: string, sowType?: "TM"|"FP", templateDocxUrl?: string, logoUrl?: string }, templateData?: Record<string, any> }
 * - autoGenerate?: boolean  If true, immediately trigger generation on mount/update (used for one-click submit).
 */
export default function DocxPreviewAndGenerate({ data, autoGenerate = false }) {
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
      // Only include fields that have input; keep unfilled tags intact in the document
      const dataMap = prepareTemplateData(data?.templateData || {}, data?.meta || {});

      // Try to locate signature from templateData (common paths)
      const templateData = data?.templateData || {};
      const auth = templateData.authorization_signatures || {};
      const signatureDataUrl =
        (typeof templateData.signature === "string" && templateData.signature) ||
        (typeof auth.signature === "string" && auth.signature) ||
        null;

      // Provide fallback images hosted under public/assets (developers can replace these files)
      const images = {
        logoDataUrl: data?.meta?.logoUrl || null,
        signatureDataUrl: signatureDataUrl || null,
        fallbackLogoUrl: "/assets/default_logo.png",
        fallbackSignatureUrl: "/assets/default_signature.png",
      };

      // Request image sizing: px width/height
      const imageSize = {
        logo: { w: 180, h: 56 },
        signature: { w: 240, h: 80 },
      };

      // mergeDocxWithData returns Promise<Blob> when images are involved
      const blob = await mergeDocxWithData(ab, dataMap, { keepUnfilledTags: true, images, imageSize });

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

  // Auto-generate on mount/update if requested (used after one-click submit)
  useEffect(() => {
    if (autoGenerate) {
      onGenerate();
    }
  }, [autoGenerate, onGenerate]);

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
