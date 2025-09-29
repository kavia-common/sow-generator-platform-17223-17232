import React, { useEffect, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * TemplatePreview
 * Loads and previews two SOW template attachments (FP and T&M) and allows users to select one.
 * Users can preview, select a template, and return to action selection comfortably.
 */
export default function TemplatePreview({ selected, onSelect }) {
  const [fpText, setFpText] = useState("");
  const [tmText, setTmText] = useState("");
  const [tab, setTab] = useState(selected === "FP" ? "FP" : selected === "TM" ? "TM" : "FP");

  useEffect(() => {
    // Load provided attachments from public path. In this environment, attachments are accessible relatively.
    fetch("/attachments/20250929_032946_Fixed%20price_Supplier_SoW_Template(docx).txt")
      .then((r) => (r.ok ? r.text() : Promise.resolve("Unable to load Fixed Price template preview.")))
      .then(setFpText)
      .catch(() => setFpText("Unable to load Fixed Price template preview."));
    fetch("/attachments/20250929_032945_T&M_Supplier_SoW_Template(docx).txt")
      .then((r) => (r.ok ? r.text() : Promise.resolve("Unable to load T&M template preview.")))
      .then(setTmText)
      .catch(() => setTmText("Unable to load T&M template preview."));
  }, []);

  const isFP = tab === "FP";
  const isTM = tab === "TM";

  return (
    <div className="panel">
      <div className="panel-title">Preview Templates</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button
          type="button"
          className="btn"
          aria-pressed={isFP}
          onClick={() => setTab("FP")}
          style={isFP ? { boxShadow: "var(--glow-purple)", borderColor: "var(--accent-purple)" } : undefined}
        >
          Fixed Price (FP)
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={isTM}
          onClick={() => setTab("TM")}
          style={isTM ? { boxShadow: "var(--glow-purple)", borderColor: "var(--accent-purple)" } : undefined}
        >
          Time & Material (T&M)
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSelect?.(tab)}
          aria-label={`Select ${tab} template`}
        >
          Select {tab}
        </button>
      </div>

      <div className="preview" style={{ maxHeight: 360, overflow: "auto" }} aria-live="polite">
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--text-primary)" }}>
          {isFP ? fpText : tmText}
        </pre>
      </div>

      <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 13 }}>
        Tip: You can switch tabs to compare templates before selecting.
      </div>
    </div>
  );
}
