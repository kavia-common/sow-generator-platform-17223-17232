import React, { useMemo, useRef, useState } from "react";
import { ensureDocxFileOrThrow } from "../services/fileValidation";
import { saveTemplateForType, hasUserTemplate, getActiveTemplateInfo } from "../services/templateStorage";

// PUBLIC_INTERFACE
export default function TemplateUploadControl({ onUploaded }) {
  /** A small control to upload a DOCX and assign to FP or TM; shows active state. */
  const [type, setType] = useState("FP");
  const [status, setStatus] = useState("");
  const inputRef = useRef(null);

  const fpInfo = useMemo(() => getActiveTemplateInfo("FP"), []);
  const tmInfo = useMemo(() => getActiveTemplateInfo("TM"), []);

  async function onFileChanged(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      ensureDocxFileOrThrow(file);
      await saveTemplateForType(type, file);
      setStatus(`Uploaded ${file.name} for ${type === "FP" ? "Fixed Price" : "T&M"}.`);
      onUploaded?.(type, file);
    } catch (err) {
      setStatus(`Upload failed: ${String(err?.message || err)}`);
    } finally {
      // reset input to allow re-selecting same file
      e.target.value = "";
    }
  }

  return (
    <div className="upload-control" style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <select
        className="select"
        value={type}
        onChange={(e) => setType(e.target.value)}
        aria-label="Assign uploaded template to type"
        title="Choose which SOW type this template is for"
        style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid var(--ui-border)", background: "rgba(255,255,255,0.6)" }}
      >
        <option value="FP">Fixed Price</option>
        <option value="TM">T&amp;M</option>
      </select>
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/octet-stream"
        style={{ display: "none" }}
        onChange={onFileChanged}
      />
      <button
        className="btn"
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Upload your .docx template"
      >
        Upload DOCX
      </button>
      <div style={{ display: "flex", gap: 6, marginLeft: 6, fontSize: 12 }}>
        <span title={fpInfo.source === "user" ? "Using your uploaded template" : "Using bundled/default template"} style={{ padding: "2px 8px", border: "1px solid var(--ui-border)", borderRadius: 999, background: fpInfo.source === "user" ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.04)" }}>
          FP: {fpInfo.source === "user" ? "Your Template" : "Bundled"}
        </span>
        <span title={tmInfo.source === "user" ? "Using your uploaded template" : "Using bundled/default template"} style={{ padding: "2px 8px", border: "1px solid var(--ui-border)", borderRadius: 999, background: tmInfo.source === "user" ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.04)" }}>
          T&M: {tmInfo.source === "user" ? "Your Template" : "Bundled"}
        </span>
      </div>
      {status ? <div style={{ marginLeft: 6, fontSize: 12, color: status.startsWith("Upload failed") ? "var(--error)" : "var(--success)" }}>{status}</div> : null}
    </div>
  );
}
