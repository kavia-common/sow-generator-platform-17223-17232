import React, { useEffect, useMemo, useState } from "react";
import { applyThemeToRoot, oceanTheme } from "../theme";
import { generateSOWFromPrompt } from "../services/aiClient";

/**
 * PUBLIC_INTERFACE
 * AIChatWidget
 * A compact floating AI/chat launcher that opens a side-panel for SOW prompt generation.
 * The launcher icon sits at bottom-right with a gradient glow per design notes.
 */
export default function AIChatWidget({ projectTitle = "Untitled Project", position = "right" }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(localStorage.getItem("sowPrompt") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    applyThemeToRoot(oceanTheme);
  }, []);

  const headerTitle = useMemo(() => {
    const t = (projectTitle || "").trim();
    return t ? t : "Untitled Project";
  }, [projectTitle]);

  const onGenerate = async () => {
    setError("");
    setResult("");
    if (!prompt.trim()) {
      setError("Please enter a prompt before generating a SOW.");
      return;
    }
    setLoading(true);
    const resp = await generateSOWFromPrompt(prompt);
    if (resp.ok) {
      setResult(resp.content);
    } else {
      setError(resp.error || "Failed to generate SOW.");
    }
    setLoading(false);
  };

  const downloadText = () => {
    const title = (headerTitle || "sow-draft").replace(/[^\w\-]+/g, "_");
    const blob = new Blob([result || ""], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${title}.txt`;
    link.click();
  };

  const rightPos = position !== "left";

  return (
    <>
      {/* Launcher button (bottom-right) */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="ai-panel"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        title={open ? "Close AI Assistant" : "Open AI Assistant"}
        style={{
          position: "fixed",
          right: rightPos ? 16 : undefined,
          left: rightPos ? undefined : 16,
          bottom: 16,
          zIndex: 60,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "radial-gradient(120% 120% at 30% 20%, var(--accent-pink), var(--accent-magenta))",
          color: "#fff",
          boxShadow: "0 6px 16px rgba(159,66,255,0.45), 0 10px 30px rgba(31,41,55,.35)",
          width: 56,
          height: 56,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
        }}
      >
        {/* Chat bubble with sparkle */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 4v-4.5A3.5 3.5 0 0 1 4 12V7Z" stroke="white" strokeWidth="1.6" fill="rgba(255,255,255,0.12)"/>
          <path d="M17.5 3.5l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8Z" fill="white"/>
        </svg>
      </button>

      {/* Slide-in panel */}
      <div
        id="ai-panel"
        role="dialog"
        aria-modal="false"
        aria-label="AI Prompt Panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(520px, 92vw)",
          transform: open ? "translateX(0%)" : "translateX(105%)",
          transition: "transform .25s ease",
          zIndex: 55,
          background: "var(--ocn-surface)",
          color: "var(--ocn-text)",
          boxShadow: "0 0 60px rgba(31,41,55,0.35)",
          borderLeft: "1px solid rgba(55,65,81,0.10)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(55,65,81,0.08)",
            background: "linear-gradient(135deg, #FFE4E6 0%, #F3E8FF 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>
              Project
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#374151" }} title={headerTitle}>
              {headerTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn"
            style={{ background: "#fff", color: "#374151" }}
            aria-label="Close"
            title="Close"
          >
            Close
          </button>
        </div>

        <div style={{ padding: 14, overflow: "auto" }}>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 8 }}>
            Describe your SOW needs. The AI will generate a structured draft based on your prompt.
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Responsive web app with auth, analytics dashboard, export features, and a 12-week delivery timeline..."
            className="textarea"
            style={{
              width: "100%",
              minHeight: 140,
              resize: "vertical",
              background: "#FFFFFF",
              color: "#374151",
              borderRadius: 12,
              border: "1px solid rgba(55,65,81,0.18)",
              padding: "12px 14px",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <button
              className="btn"
              type="button"
              onClick={() => localStorage.setItem("sowPrompt", prompt || "")}
              title="Save prompt locally"
              style={{ background: "#fff", color: "#374151" }}
            >
              Save Prompt
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={onGenerate}
              disabled={loading}
              title="Generate SOW draft"
            >
              {loading ? "Generating..." : "Generate SOW"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={downloadText}
              disabled={!result}
              title="Download generated draft as .txt"
              style={{ background: "#fff", color: "#374151" }}
            >
              Download Draft (.txt)
            </button>
            <span style={{ color: "#6B7280", fontSize: 12 }}>
              {loading ? "Contacting AI service..." : "Uses configured AI service"}
            </span>
          </div>

          {error ? (
            <div
              role="alert"
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(254,226,226,0.6)",
                color: "#7F1D1D",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            className="preview"
            style={{
              marginTop: 12,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.75))",
              borderRadius: 16,
              border: "1px solid rgba(111,63,255,.25)",
              boxShadow: "0 0 24px rgba(111,63,255,0.15)",
              padding: 12,
              color: "#1F2937",
            }}
            aria-live="polite"
          >
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              {result || "Your generated SOW will appear here."}
            </pre>
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid rgba(55,65,81,0.08)",
            color: "#6B7280",
            fontSize: 12
          }}
        >
          Tip: Include scope, deliverables, constraints, and timelines for best results.
        </div>
      </div>
    </>
  );
}
