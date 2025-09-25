import React from "react";
import "./Hero.css";

/**
 * PUBLIC_INTERFACE
 * Hero section: center-focused layout with headline and subheadline.
 * CTAs removed to comply with requirement to disable add-new actions.
 */
export default function Hero() {
  return (
    <section className="hero" role="region" aria-label="Intro">
      <div className="hero-inner">
        <h1 className="hero-title">Compose Statements of Work with confidence</h1>
        <p className="hero-subtitle">
          A focused workspace to capture project details, select templates, and craft drafts you can refine and export.
        </p>
      </div>
    </section>
  );
}
