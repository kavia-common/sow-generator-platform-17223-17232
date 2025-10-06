import React from "react";
import "../theme.css";

/**
 * PUBLIC_INTERFACE
 * ReviewTable
 * Two-column label/value table with dark theme styling and accessibility.
 */
export default function ReviewTable({ rows = [], placeholder = "—" }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: 10 }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 520 }}>
        <thead style={{ background: "var(--table-header-bg)" }}>
          <tr>
            <th scope="col" style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, fontSize: 13, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-divider)", position: "sticky", top: 0, background: "var(--table-header-bg)", zIndex: 1 }}>Field</th>
            <th scope="col" style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, fontSize: 13, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-divider)", position: "sticky", top: 0, background: "var(--table-header-bg)", zIndex: 1 }}>Your Entry</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => (
            <tr key={r.key || `${r.label}-${i}`} style={{ background: i % 2 === 0 ? "var(--table-row-bg)" : "var(--table-row-alt-bg)" }}>
              <td style={{ width: "32%", padding: "10px 12px", verticalAlign: "top", borderBottom: "1px solid var(--color-divider)", fontWeight: 700, color: "var(--color-text)", wordBreak: "break-word" }}>{r.label}</td>
              <td style={{ width: "68%", padding: "10px 12px", verticalAlign: "top", borderBottom: "1px solid var(--color-divider)", color: "var(--color-text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {renderValue(r.value, placeholder)}
              </td>
            </tr>
          ))}
          {safeRows.length === 0 ? (
            <tr><td colSpan={2} style={{ padding: 12, color: "var(--color-text-muted)" }}>No fields to display.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

// PUBLIC_INTERFACE
export function renderValue(value, placeholder = "—") {
  if (value == null || value === "") return <span style={{ color: "var(--color-text-muted)" }}>{placeholder}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--color-text-muted)" }}>{placeholder}</span>;
    const isObjArray = value.some((v) => v && typeof v === "object" && !Array.isArray(v));
    if (isObjArray) {
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {value.map((v, i) => (
            <div key={i} style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 10px" }}>
              <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                {tryStringify(v)}
              </code>
            </div>
          ))}
        </div>
      );
    }
    return <ul style={{ margin: 0, paddingLeft: 18 }}>{value.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span style={{ color: "var(--color-text-muted)" }}>{placeholder}</span>;
    return (
      <div style={{ display: "grid", gap: 4 }}>
        {entries.map(([k, v]) => (
          <div key={k}><span style={{ fontWeight: 700 }}>{k}:</span> <span>{formatScalar(v)}</span></div>
        ))}
      </div>
    );
  }
  return <span>{formatScalar(value)}</span>;
}

function formatScalar(v) {
  if (v == null) return "";
  return String(v);
}
function tryStringify(v) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
