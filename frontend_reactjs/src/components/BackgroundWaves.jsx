import React from "react";
import "./BackgroundWaves.css";

/**
 * Full-bleed neon gradient background with radial glows and a blurred ribbon.
 * Sits as a fixed back layer behind all content.
 */
export default function BackgroundWaves() {
  return (
    <div className="bg-waves" aria-hidden="true">
      <div className="bg-radial left" />
      <div className="bg-radial right" />
      <svg className="bg-ribbon" viewBox="0 0 1440 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-purple)" />
            <stop offset="50%" stopColor="var(--accent-magenta)" />
            <stop offset="100%" stopColor="var(--accent-pink)" />
          </linearGradient>
          <filter id="softBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.85 0"/>
          </filter>
        </defs>
        <path
          d="M0,480 C220,420 420,620 640,520 C820,440 1080,300 1440,380 L1440,600 L0,600 Z"
          fill="url(#ribbonGradient)"
          filter="url(#softBlur)"
          opacity="0.75"
        />
      </svg>
    </div>
  );
}
