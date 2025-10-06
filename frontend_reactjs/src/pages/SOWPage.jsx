import React from 'react';
import '../theme.css';
import '../styles.css';
import SowPreamble from '../components/SowPreamble';

/**
 * PUBLIC_INTERFACE
 * SOWPage
 * Minimal page rendering the SOW heading with the required sentence.
 */
export default function SOWPage() {
  return (
    <div className="workspace" style={{ maxWidth: 960, margin: '0 auto', padding: '16px', minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>
          Statement of Work to Master Service Agreement
        </h1>
      </header>
      <SowPreamble value={{ preamble: {} }} onChange={() => {}} />
    </div>
  );
}
