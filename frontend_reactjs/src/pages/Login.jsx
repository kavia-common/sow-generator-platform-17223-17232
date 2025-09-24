import React, { useEffect, useState } from "react";
import { applyThemeToRoot, oceanTheme } from "../theme";
import { generateSOWFromPrompt } from "../services/aiClient";

/**
 * PUBLIC_INTERFACE
 * Login page styled with the Ocean Professional (Elegant) theme.
 * Left side: Login form. Right side: AI prompt input panel for SOW generation.
 * After generation, shows a Download PDF button (local-only; no cloud upload).
 */
export default function Login() {
  useEffect(() => {
    // Ensure Ocean Professional theme tokens are applied (light Elegant palette)
    applyThemeToRoot(oceanTheme);
  }, []);

  // AI Prompt state and UI flags
  const [prompt, setPrompt] = useState(localStorage.getItem("sowPrompt") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [downloadReady, setDownloadReady] = useState(false);

  const onGenerate = async () => {
    setError("");
    setResult("");
    setDownloadReady(false);
    if (!prompt.trim()) {
      setError("Please enter a prompt before generating a SOW.");
      return;
    }
    setLoading(true);
    const resp = await generateSOWFromPrompt(prompt);
    if (resp.ok) {
      setResult(resp.content);
      setDownloadReady(true);
    } else {
      setError(resp.error || "Failed to generate SOW.");
    }
    setLoading(false);
  };

  // Create a simple PDF client-side without external libs using a data URL technique
  // For high fidelity PDFs consider pdf-lib or jsPDF; here we keep zero deps as requested.
  const downloadPDF = () => {
    try {
      const title = "SOW_Document";
      // Wrap plain text content into a minimal PDF. This approach encodes the text and places it in a simple PDF object.
      // Note: This is a simplified generator suitable for plain text; complex layout requires a PDF library.
      const escapePdfText = (t) =>
        String(t)
          .replace(/\\/g, "\\\\")
          .replace(/\(/g, "\\(")
          .replace(/\)/g, "\\)")
          .replace(/\r/g, "")
          .replace(/\t/g, "    ");

      const lines = escapePdfText(result || "").split("\n");
      const contentStream = [
        "BT",
        "/F1 10 Tf",
        "36 806 Td", // start near top-left
        ...lines.map((ln, i) => {
          const yShift = i === 0 ? 0 : -14;
          return `${i === 0 ? "" : "T*"} (${ln || " "}) Tj`;
        }),
        "ET",
      ].join("\n");

      // Build a bare-bones PDF with one page and a single text stream
      const objects = [];
      const addObject = (str) => {
        objects.push(str);
        return objects.length;
      };

      const fontObjNum = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
      const contentsStream = `${contentStream}`;
      const contentsBytes = new TextEncoder().encode(contentsStream);
      const contentsLen = contentsBytes.length;
      const contentObjNum = addObject(`<< /Length ${contentsLen} >>\nstream\n${contentsStream}\nendstream`);
      const resourcesObjNum = addObject(`<< /Font << /F1 ${fontObjNum} 0 R >> >>`);
      const pageObjNum = addObject(
        `<< /Type /Page /Parent 4 0 R /Resources ${resourcesObjNum} 0 R /Contents ${contentObjNum} 0 R /MediaBox [0 0 612 792] >>`
      );
      const pagesObjNum = addObject(`<< /Type /Pages /Kids [ ${pageObjNum} 0 R ] /Count 1 >>`);
      const catalogObjNum = addObject(`<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`);

      // Assemble xref
      let pdf = "%PDF-1.4\n";
      const offsets = [];
      const writeObj = (num, body) => {
        offsets[num] = pdf.length;
        pdf += `${num} 0 obj\n${body}\nendobj\n`;
      };

      // Write in numeric order
      writeObj(1, objects[0]); // font
      writeObj(2, objects[1]); // contents
      writeObj(3, objects[2]); // resources
      writeObj(4, objects[3]); // page
      writeObj(5, objects[4]); // pages
      writeObj(6, objects[5]); // catalog

      const xrefPos = pdf.length;
      pdf += "xref\n0 7\n";
      pdf += "0000000000 65535 f \n";
      for (let i = 1; i <= 6; i++) {
        const off = String(offsets[i] || 0).padStart(10, "0");
        pdf += `${off} 00000 n \n`;
      }
      pdf += `trailer\n<< /Size 7 /Root 6 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

      const blob = new Blob([pdf], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      requestAnimationFrame(() => {
        URL.revokeObjectURL(link.href);
        link.remove();
      });
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Failed to generate PDF: ${e?.message || e}`);
    }
  };

  return (
    <div
      className="login-root"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--ocn-bg)", // #FDF2F8 via theme.js
      }}
    >
      <div
        className="login-container"
        role="main"
        aria-label="Login and AI Prompt"
        style={{
          width: "min(1100px, 92vw)",
          borderRadius: 20,
          background: "var(--ocn-surface)", // #FFFFFF
          color: "var(--ocn-text)", // #374151
          boxShadow: "0 20px 60px rgba(31,41,55,0.12)",
          border: "1px solid rgba(55,65,81,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Header / Title */}
        <div
          style={{
            padding: "28px 28px 16px",
            borderBottom: "1px solid rgba(55,65,81,0.08)",
            background: "linear-gradient(135deg, #FFE4E6 0%, #F3E8FF 100%)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              color: "#374151",
            }}
          >
            Compose Statements of Work
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              color: "#6B7280",
              fontSize: 14,
            }}
          >
            Sign in to manage your projects and generate SOW drafts with AI-assisted prompts.
          </p>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
            Tip: In preview, open the AI Prompt by navigating to this URL with <code>#login</code> suffix.
          </div>
        </div>

        {/* Content: Grid with left login form and right AI prompt panel */}
        <div
          className="login-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
          }}
        >
          {/* Left: Login Form */}
          <div
            style={{
              padding: 28,
              background:
                "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.96) 100%)",
            }}
          >
            <div
              className="panel"
              style={{
                background: "white",
                border: "1px solid rgba(55,65,81,0.08)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                className="panel-title"
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 12,
                  color: "#374151",
                }}
              >
                Welcome back
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Placeholder login logic; integrate real auth later
                  // eslint-disable-next-line no-alert
                  alert("Login submitted (placeholder).");
                }}
              >
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="form-control" style={{ display: "grid", gap: 6 }}>
                    <label className="label" htmlFor="email" style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      className="input"
                      placeholder="you@company.com"
                      style={{
                        border: "1px solid rgba(55,65,81,0.18)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        outline: "none",
                        color: "#374151",
                        background: "#FFFFFF",
                      }}
                    />
                  </div>
                  <div className="form-control" style={{ display: "grid", gap: 6 }}>
                    <label className="label" htmlFor="password" style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      className="input"
                      placeholder="••••••••"
                      style={{
                        border: "1px solid rgba(55,65,81,0.18)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        outline: "none",
                        color: "#374151",
                        background: "#FFFFFF",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#6B7280", fontSize: 14 }}>
                    <input type="checkbox" />
                    Remember me
                  </label>
                  <a href="#forgot" style={{ color: "#F59E0B", textDecoration: "none", fontSize: 14 }}>
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    marginTop: 16,
                    borderRadius: 999,
                    border: "1px solid rgba(55,65,81,0.1)",
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #F472B6, #F59E0B)",
                    color: "#fff",
                    fontWeight: 700,
                    boxShadow: "0 8px 28px rgba(244,114,182,0.24)",
                    cursor: "pointer",
                  }}
                >
                  Sign In
                </button>

                <div
                  style={{
                    textAlign: "center",
                    marginTop: 12,
                    color: "#6B7280",
                    fontSize: 14,
                  }}
                >
                  Don’t have an account?{" "}
                  <a href="#signup" style={{ color: "#F472B6", textDecoration: "none", fontWeight: 600 }}>
                    Create one
                  </a>
                </div>
              </form>
            </div>
          </div>

          {/* Right: AI Prompt Panel */}
          <div
            style={{
              padding: 28,
              background:
                "linear-gradient(135deg, rgba(255,228,230,0.85) 0%, rgba(243,232,255,0.85) 100%)",
              borderLeft: "1px solid rgba(55,65,81,0.08)",
            }}
          >
            <div
              className="panel"
              style={{
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(55,65,81,0.12)",
                borderRadius: 16,
                padding: 20,
                boxShadow: "0 10px 30px rgba(31,41,55,0.10)",
              }}
            >
              <div
                className="panel-title"
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 6,
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span role="img" aria-label="sparkles">✨</span>
                AI Prompt for SOW
              </div>
              <p style={{ margin: "0 0 12px", color: "#6B7280", fontSize: 14 }}>
                Describe your project requirements, then generate a draft Statement of Work using AI.
              </p>
              <textarea
                className="textarea"
                placeholder="e.g., Build a responsive web app with user authentication, dashboard analytics, and export features..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 160,
                  resize: "vertical",
                  border: "1px solid rgba(55,65,81,0.18)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  outline: "none",
                  color: "#374151",
                  background: "#FFFFFF",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => localStorage.setItem("sowPrompt", prompt || "")}
                  style={{
                    borderRadius: 999,
                    padding: "10px 14px",
                    background: "#FFFFFF",
                    border: "1px solid rgba(55,65,81,0.18)",
                    color: "#374151",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save Prompt
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={onGenerate}
                  disabled={loading}
                  style={{
                    borderRadius: 999,
                    padding: "10px 14px",
                    background: "linear-gradient(135deg, #FFE4E6, #F3E8FF)",
                    border: "1px solid rgba(244,114,182,0.55)",
                    color: "#374151",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.8 : 1,
                  }}
                >
                  {loading ? "Generating..." : "Generate SOW"}
                </button>

                {/* Download PDF appears only after a successful generation */}
                {downloadReady ? (
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={downloadPDF}
                    style={{
                      borderRadius: 999,
                      padding: "10px 14px",
                      color: "#fff",
                    }}
                    aria-label="Download generated SOW as PDF"
                    title="Download PDF"
                  >
                    Download PDF
                  </button>
                ) : null}

                <span style={{ color: "#6B7280", fontSize: 12 }}>
                  {loading ? "Contacting AI service..." : "Uses configured AI service"}
                </span>
              </div>

              {/* Error state */}
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

              {/* Result panel */}
              <div
                className="preview"
                style={{
                  marginTop: 12,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.75))",
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

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Tip: Keep prompts concise but specific. Include scope, deliverables, constraints, and timelines for best results.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle background flourish */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background:
            "radial-gradient(900px 600px at 10% 0%, rgba(244,114,182,0.20), transparent 60%), radial-gradient(900px 600px at 90% 20%, rgba(245,158,11,0.15), transparent 60%)",
        }}
      />
    </div>
  );
}
