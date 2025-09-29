import React, { useEffect, useMemo, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * TemplatePreview
 * Loads and previews two SOW template attachments (FP and T&M) and allows users to select one.
 * Users can preview, select a template, and return to action selection comfortably.
 * Renders a readable "DOCX-like" preview card with a faux page look.
 */
export default function TemplatePreview({ selected, onSelect }) {
  const [fpText, setFpText] = useState("");
  const [tmText, setTmText] = useState("");
  const [tab, setTab] = useState(selected === "FP" ? "FP" : selected === "TM" ? "TM" : "FP");

  useEffect(() => {
    // Load provided attachments from public path.
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
  const docText = isFP ? fpText : tmText;

  const simulatedDocx = useMemo(() => {
    // Very light transformation to emulate headings and blocks
    const lines = String(docText || "").split(/\r?\n/);
    return lines
      .map((l) => {
        if (/^\s*(Statement of Work|Scope of Work|Authorization|Project|Work Order)/i.test(l)) {
          return `<h3 style="margin: 12px 0 6px 0; font-weight: 800;">${escapeHtml(l)}</h3>`;
        }
        return `<p style="margin: 6px 0">${escapeHtml(l)}</p>`;
      })
      .join("");
  }, [docText]);

  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

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

      {/* Faux DOCX page preview */}
      <div
        style={{
          display: "grid",
          placeItems: "center",
          padding: 8
        }}
      >
        <div
          style={{
            background: "#fff",
            color: "#111",
            width: "min(780px, 96%)",
            minHeight: 420,
            border: "1px solid #ddd",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            borderRadius: 4,
            padding: "28px 36px",
            overflow: "auto",
            maxHeight: 420
          }}
          aria-live="polite"
        >
          <div dangerouslySetInnerHTML={{ __html: simulatedDocx }} />
        </div>
      </div>

      <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 13 }}>
        Tip: You can switch tabs to compare templates before selecting. The preview emulates the DOCX layout for readability.
      </div>
    </div>
  );
}
