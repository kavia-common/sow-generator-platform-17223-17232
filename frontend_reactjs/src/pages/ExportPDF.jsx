import React, { useState } from "react";
import { supabase } from "../supabaseClient";

// PUBLIC_INTERFACE
export default function ExportPDF({ draft, meta }) {
  /**
   * MVP: Store draft text to Supabase (as a row) and simulate PDF download.
   * In a full impl, use a PDF library (e.g., pdf-lib) to render and download.
   */
  const [status, setStatus] = useState("");

  const saveToSupabase = async () => {
    try {
      setStatus("Saving to Supabase...");
      const { data, error } = await supabase
        .from("sows")
        .insert([{ title: meta?.title || "Untitled SOW", template: meta?.template, content: draft }])
        .select();
      if (error) throw error;
      setStatus(`Saved. Row ID: ${data?.[0]?.id ?? "n/a"}`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const downloadText = () => {
    const blob = new Blob([draft || ""], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `${meta?.title || "sow-draft"}.txt`;
    link.click();
  };

  return (
    <div className="panel">
      <div className="panel-title">Export</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button className="btn" onClick={downloadText}>Download Draft (txt)</button>
        <button className="btn primary" onClick={saveToSupabase}>Save to Supabase</button>
      </div>
      <div style={{ color: "#6b7280" }}>{status || "Export your SOW as PDF (future) or save to Supabase."}</div>
    </div>
  );
}
