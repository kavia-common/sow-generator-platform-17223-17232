import React, { useEffect } from "react";
import { applyThemeToRoot, oceanTheme } from "../theme";

/**
 * PUBLIC_INTERFACE
 * Login page styled with the Ocean Professional (Elegant) theme.
 * Left side: Login form. Right side: AI prompt input panel for SOW generation.
 */
export default function Login() {
  useEffect(() => {
    // Ensure Ocean Professional theme tokens are applied (light Elegant palette)
    applyThemeToRoot(oceanTheme);
  }, []);

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
                Describe your project requirements. After sign-in, you’ll be able to generate a draft Statement of Work from this prompt.
              </p>
              <textarea
                className="textarea"
                placeholder="e.g., Build a responsive web app with user authentication, dashboard analytics, and export features..."
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
                onChange={() => {
                  // Placeholder only; value would be persisted to state or storage once authenticated
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    // eslint-disable-next-line no-alert
                    alert("Prompt saved locally (placeholder).");
                  }}
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
                  onClick={() => {
                    // eslint-disable-next-line no-alert
                    alert("This will generate a SOW draft after login (placeholder).");
                  }}
                  style={{
                    borderRadius: 999,
                    padding: "10px 14px",
                    background: "linear-gradient(135deg, #FFE4E6, #F3E8FF)",
                    border: "1px solid rgba(244,114,182,0.55)",
                    color: "#374151",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Preview Draft (UI only)
                </button>
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
