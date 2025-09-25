import React, { useEffect, useMemo, useState } from "react";
import { applyThemeToRoot, oceanTheme } from "../theme";
import { generateSOWFromPrompt } from "../services/aiClient";

/**
 * PUBLIC_INTERFACE
 * AIChatWidget
 * A compact floating AI/chat launcher that opens a side-panel for SOW prompt generation.
 * - No login UI
 * - Shows only the current project title (provided by parent)
 * - Elegant Ocean Professional styling
 */
export default function AIChatWidget({ projectTitle = "Untitled Project" }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(localStorage.getItem("sowPrompt") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Ensure theme tokens exist even if app didn't set it yet
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

  return (
    <>
      {/* Launcher button (bottom-left) */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="ai-panel"
        onClick={() => setOpen(v => !v)}
        title={open ? "Close AI Prompt" : "Open AI Prompt"}
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          zIndex: 60,
          borderRadius: 999,
          border: "1px solid var(--ui-border)",
          background: "linear-gradient(135deg, #FFE4E6, #F3E8FF)",
          color: "var(--ocn-text)",
          boxShadow: "0 10px 30px rgba(31,41,55,.25)",
          width: 48,
          height: 48,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
        }}
      >
        {/* Simple modern chat bubble icon (SVG) */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6.5C4 5.12 5.12 4 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H10l-4 4v-4.5A2.5 2.5 0 0 1 4 12.5v-6Z"
            stroke="url(#g1)"
            strokeWidth="1.5"
            fill="rgba(255,255,255,0.85)"
          />
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#F472B6" />
              <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
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
        {/* Header with current project title only */}
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

        {/* Content */}
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

        {/* Footer subtle note */}
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
