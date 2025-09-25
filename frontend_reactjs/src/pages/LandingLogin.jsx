import React, { useEffect, useState } from "react";
import BackgroundWaves from "../components/BackgroundWaves";
import "../theme.css";
import "../styles.css";
import { applyThemeToRoot, oceanTheme } from "../theme";

/**
 * PUBLIC_INTERFACE
 * LandingLogin
 * Elegant landing page hero with a centered login card.
 * Matches the neon gradient/dark theme and provides email/password (local) or magic link email.
 */
export default function LandingLogin({ onContinue }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    applyThemeToRoot(oceanTheme);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // MVP: no actual auth; simply continue
    setStatus("Signing in...");
    setTimeout(() => {
      setStatus("");
      onContinue?.({ email });
    }, 500);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <BackgroundWaves />
      <header className="site-header" role="banner" aria-label="Main navigation">
        <div className="nav-pill">
          <div className="brand-chip" aria-label="Brand">
            <span role="img" aria-label="star">★</span>
            <span>Delta</span>
          </div>
          <nav className="nav-links" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#docs">Docs</a>
          </nav>
          <div className="header-actions">
            <button className="btn">Sign In</button>
            <button className="btn btn-primary" onClick={() => onContinue?.({})}>Get Started</button>
          </div>
        </div>
      </header>

      <main role="main" style={{ position: "relative", zIndex: 2, width: "100%" }}>
        <section className="hero" role="region" aria-label="Intro" style={{ paddingTop: 120, paddingBottom: 40 }}>
          <div className="hero-inner">
            <h1 className="hero-title" style={{ WebkitTextFillColor: "transparent", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.72))", WebkitBackgroundClip: "text" }}>
              Your New AI Assistant
            </h1>
            <p className="hero-subtitle">Get AI-generated Data Solutions in Seconds</p>
          </div>
        </section>

        {/* Login Card */}
        <div style={{ display: "grid", placeItems: "center", marginTop: -40 }}>
          <form
            onSubmit={handleSubmit}
            aria-label="Login form"
            style={{
              width: "min(440px, 92vw)",
              background: "rgba(16,14,20,0.72)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              boxShadow: "0 10px 28px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.03)",
              padding: 24,
              color: "var(--text-primary)",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Welcome back</div>
            <div style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
              Sign in to continue to the SOW workspace.
            </div>

            <div className="form-control" style={{ marginBottom: 12 }}>
              <label className="label" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  height: 44,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                }}
              />
            </div>
            <div className="form-control" style={{ marginBottom: 16 }}>
              <label className="label" style={{ textTransform: "uppercase", letterSpacing: ".04em" }}>Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                style={{
                  height: 44,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                }}
              />
            </div>

            <button className="btn btn-primary" type="submit" style={{ width: "100%", height: 46 }}>
              Sign In
            </button>
            <div style={{ marginTop: 10, color: "var(--text-secondary)", fontSize: 12 }}>
              {status || "By continuing, you agree to our terms."}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
