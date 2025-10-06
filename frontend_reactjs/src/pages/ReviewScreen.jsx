import React, { useMemo } from "react";
import "../theme.css";
import "../styles.css";
import { makeTranscriptPreviewHtml } from "../services/docxTemplateService";

/**
 * PUBLIC_INTERFACE
 * ReviewScreen
 * Renders read-only preview without logos to avoid duplication with DOCX header.
 */
export default function ReviewScreen({ transcriptText }) {
  const previewHtml = useMemo(() => makeTranscriptPreviewHtml(transcriptText || ""), [transcriptText]);

  return (
    <div className="preview review-surface" style={{ padding: 16 }}>
      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
    </div>
  );
}
