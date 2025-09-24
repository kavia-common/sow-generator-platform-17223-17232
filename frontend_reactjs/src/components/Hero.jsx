import React from "react";
import "./Hero.css";

/**
 * PUBLIC_INTERFACE
 * Hero section: center-focused layout with headline, subheadline and CTAs.
 */
export default function Hero({ onPrimary, onSecondary }) {
  return (
    <section className="hero" role="region" aria-label="Intro">
      <div className="hero-inner">
        <h1 className="hero-title">Compose Statements of Work with confidence</h1>
        <p className="hero-subtitle">
          A focused workspace to capture project details, select templates, and craft drafts you can refine and export.
        </p>
        <div className="cta-group">
          <button className="btn btn-primary" onClick={onPrimary}>Start a new SOW</button>
          <button className="btn btn-ghost" onClick={onSecondary}>Browse templates</button>
        </div>
      </div>
    </section>
  );
}
