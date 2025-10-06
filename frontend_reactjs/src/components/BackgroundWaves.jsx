import React from 'react';
import './BackgroundWaves.css';

/**
 * PUBLIC_INTERFACE
 * BackgroundWaves
 * Decorative background for dark theme using soft gradients and animated ribbons.
 */
export default function BackgroundWaves() {
  return (
    <div className="bg-waves" aria-hidden="true">
      <div className="bg-radial left" />
      <div className="bg-radial right" />
      <svg className="bg-ribbon" viewBox="0 0 1200 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ribbonGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(244,114,182,0.28)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.25)" />
          </linearGradient>
        </defs>
        <path
          d="M0,400 C300,300 600,500 900,400 C1050,350 1120,300 1200,320 L1200,600 L0,600 Z"
          fill="url(#ribbonGrad)"
        />
      </svg>
    </div>
  );
}
