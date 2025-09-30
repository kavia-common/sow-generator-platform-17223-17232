//
// PUBLIC_INTERFACE
// Bundled templates registry for T&M and Fixed Price.
// Provides:
// - getBundledTemplateInfoByType: Given "TM" or "FP", returns docxUrl and transcript URL(s)
// - ensureSampleDocxIfMissing: runtime helper to gracefully fallback to a docx rendered from transcript lines when a real docx is missing.

export function getBundledTemplateInfoByType(type) {
  // Use EXACT filenames supplied by the user, expected under public/templates
  // - T&M -> T&M_Supplier_SoW_Template.docx
  // - Fixed Price -> Fixed price_Supplier_SoW_Template.docx
  const map = {
    TM: {
      id: "SOW_TM_SUPPLIER",
      title: "Supplier SOW (T&M)",
      docxUrl: "/templates/T&M_Supplier_SoW_Template.docx",
      transcripts: [
        "/attachments/20250930_185406_T&M_Supplier_SoW_Template(docx).txt",
        "/attachments/20250930_181149_T&M_Supplier_SoW_Template(docx).txt",
        "/attachments/20250930_160627_T&M_Supplier_SoW_Template(docx).txt",
        "/attachments/20250930_035345_T&M_Supplier_SoW_Template(docx).txt"
      ]
    },
    FP: {
      id: "SOW_FIXED_PRICE_SUPPLIER",
      title: "Supplier SOW (Fixed Price)",
      docxUrl: "/templates/Fixed price_Supplier_SoW_Template.docx",
      transcripts: [
        "/attachments/20250930_185442_Fixed price_Supplier_SoW_Template(docx).txt",
        "/attachments/20250930_181148_Fixed price_Supplier_SoW_Template(docx).txt",
        "/attachments/20250930_160627_Fixed price_Supplier_SoW_Template(docx).txt",
        "/attachments/20250930_035346_Fixed price_Supplier_SoW_Template(docx).txt"
      ]
    }
  };
  return map[type] || null;
}

// PUBLIC_INTERFACE
export async function ensureSampleDocxIfMissing(type, data) {
  // Try to fetch the bundled docx head. If not found, return a generated minimal DOCX from the transcript.
  const info = getBundledTemplateInfoByType(type);
  if (!info) return null;

  // Probe if the bundled DOCX exists
  try {
    const head = await fetch(info.docxUrl, { method: "HEAD" });
    if (head.ok) {
      return { ok: true, kind: "bundled", blob: null, url: info.docxUrl };
    }
  } catch {
    // proceed to fallback
  }

  // Fallback: use transcript -> merge -> build basic docx
  try {
    // Load the first available transcript
    let transcript = "";
    for (const u of info.transcripts) {
      try {
        const r = await fetch(u);
        if (r.ok) {
          transcript = await r.text();
          if (transcript && transcript.trim().length > 0) break;
        }
      } catch {
        // try the next one
      }
    }
    if (!transcript) {
      return { ok: false, kind: "missing", reason: `No transcript found for ${type}` };
    }

    // Merge transcript with user data
    const { interpolateTranscriptStrict, mapUserDataForTemplateStrict, generateDocxFromTranscriptLines, zipSync } = await import("./strictDocxTemplateMergeService.js");
    const mapping = mapUserDataForTemplateStrict(data || {});
    const merged = interpolateTranscriptStrict(transcript, mapping);
    const files = generateDocxFromTranscriptLines(merged, { logoDataUrl: data?.meta?.logoUrl });
    const blob = zipSync(files);
    return { ok: true, kind: "fallback", blob, url: null };
  } catch (e) {
    return { ok: false, kind: "error", reason: String(e?.message || e) };
  }
}
