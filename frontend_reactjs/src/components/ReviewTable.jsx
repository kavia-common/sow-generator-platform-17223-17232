import React from "react";

/**
 * PUBLIC_INTERFACE
 * ReviewTable
 * Renders a neat two-column table of label/value rows with:
 * - Single appearance per field
 * - Alternating row backgrounds
 * - Clear placeholder for empty values
 * - Responsive widths and wrapping for long/multi-line content
 *
 * Props:
 * - rows: Array<{ label: string, value: any, key?: string }>
 * - placeholder?: string (default: "—")
 */
export default function ReviewTable({ rows, placeholder = "—" }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--ui-border)", borderRadius: 10 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          minWidth: 520,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "10px 12px",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--text-secondary)",
                borderBottom: "1px solid var(--ui-border)",
                position: "sticky",
                top: 0,
                background: "var(--bg-elevated)",
                zIndex: 1,
              }}
            >
              Field
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "10px 12px",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--text-secondary)",
                borderBottom: "1px solid var(--ui-border)",
                position: "sticky",
                top: 0,
                background: "var(--bg-elevated)",
                zIndex: 1,
              }}
            >
              Your Entry
            </th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => {
            const bg = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.03)";
            return (
              <tr key={r.key || `${r.label}-${i}`} style={{ background: bg }}>
                <td
                  style={{
                    width: "32%",
                    padding: "10px 12px",
                    verticalAlign: "top",
                    borderBottom: "1px solid var(--ui-border)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    wordBreak: "break-word",
                  }}
                >
                  {r.label}
                </td>
                <td
                  style={{
                    width: "68%",
                    padding: "10px 12px",
                    verticalAlign: "top",
                    borderBottom: "1px solid var(--ui-border)",
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {renderValue(r.value, placeholder)}
                </td>
              </tr>
            );
          })}
          {safeRows.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ padding: 12, color: "var(--text-secondary)" }}>
                No fields to display.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

// PUBLIC_INTERFACE
export function renderValue(value, placeholder = "—") {
  /** This helper renders lists/objects/multi-line values cleanly for the table. */
  if (value == null || value === "") return <span style={{ color: "var(--text-secondary)" }}>{placeholder}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--text-secondary)" }}>{placeholder}</span>;
    // If array of objects, show each object as JSON on its own line; else bullet list
    const isObjArray = value.some((v) => v && typeof v === "object" && !Array.isArray(v));
    if (isObjArray) {
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {value.map((v, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--ui-border)", borderRadius: 8, padding: "8px 10px" }}>
              <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                {tryStringify(v)}
              </code>
            </div>
          ))}
        </div>
      );
    }
    return (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {value.map((v, i) => (
          <li key={i}>{String(v)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    // Show as key: value lines
    const entries = Object.entries(value);
    if (entries.length === 0) return <span style={{ color: "var(--text-secondary)" }}>{placeholder}</span>;
    return (
      <div style={{ display: "grid", gap: 4 }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <span style={{ fontWeight: 700 }}>{k}:</span> <span>{formatScalar(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{formatScalar(value)}</span>;
}

function formatScalar(v) {
  if (v == null) return "";
  const s = String(v);
  // handle embedded newlines
  return s;
}

function tryStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
