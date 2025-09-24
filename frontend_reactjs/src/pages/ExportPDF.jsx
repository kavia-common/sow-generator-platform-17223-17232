import React, { useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * PUBLIC_INTERFACE
 * ExportPDF
 * Provides local-only PDF download and an optional save to Supabase.
 * The PDF is generated client-side and saved to the user's machine.
 */
export default function ExportPDF({ draft, meta }) {
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

  // Minimal PDF generation (single page, plain text) without external libs
  const downloadPDF = () => {
    try {
      const title = (meta?.title || "SOW_Document").replace(/[^\w\-]+/g, "_");
      const escapePdfText = (t) =>
        String(t || "")
          .replace(/\\/g, "\\\\")
          .replace(/\(/g, "\\(")
          .replace(/\)/g, "\\)")
          .replace(/\r/g, "")
          .replace(/\t/g, "    ");
      const lines = escapePdfText(draft || "").split("\n");
      const contentStream = [
        "BT",
        "/F1 10 Tf",
        "36 806 Td",
        ...lines.map((ln, i) => `${i === 0 ? "" : "T*"} (${ln || " "}) Tj`),
        "ET",
      ].join("\n");

      const objects = [];
      const addObject = (str) => {
        objects.push(str);
        return objects.length;
      };

      const fontObjNum = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
      const contentsBytes = new TextEncoder().encode(contentStream);
      const contentObjNum = addObject(`<< /Length ${contentsBytes.length} >>\nstream\n${contentStream}\nendstream`);
      const resourcesObjNum = addObject(`<< /Font << /F1 ${fontObjNum} 0 R >> >>`);
      const pageObjNum = addObject(
        `<< /Type /Page /Parent 4 0 R /Resources ${resourcesObjNum} 0 R /Contents ${contentObjNum} 0 R /MediaBox [0 0 612 792] >>`
      );
      const pagesObjNum = addObject(`<< /Type /Pages /Kids [ ${pageObjNum} 0 R ] /Count 1 >>`);
      const catalogObjNum = addObject(`<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`);

      let pdf = "%PDF-1.4\n";
      const offsets = [];
      const writeObj = (num, body) => {
        offsets[num] = pdf.length;
        pdf += `${num} 0 obj\n${body}\nendobj\n`;
      };

      writeObj(1, objects[0]); // font
      writeObj(2, objects[1]); // contents
      writeObj(3, objects[2]); // resources
      writeObj(4, objects[3]); // page
      writeObj(5, objects[4]); // pages
      writeObj(6, objects[5]); // catalog

      const xrefPos = pdf.length;
      pdf += "xref\n0 7\n";
      pdf += "0000000000 65535 f \n";
      for (let i = 1; i <= 6; i++) {
        const off = String(offsets[i] || 0).padStart(10, "0");
        pdf += `${off} 00000 n \n`;
      }
      pdf += `trailer\n<< /Size 7 /Root 6 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

      const blob = new Blob([pdf], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      requestAnimationFrame(() => {
        URL.revokeObjectURL(link.href);
        link.remove();
      });
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(`Failed to generate PDF: ${e?.message || e}`);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">Export</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={downloadText}>Download Draft (txt)</button>
        <button className="btn btn-primary" type="button" onClick={downloadPDF}>Download PDF</button>
        <button className="btn" onClick={saveToSupabase} title="Optional">Save to Supabase</button>
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        {status || "Download your SOW locally as a PDF or text file. Saving to Supabase is optional."}
      </div>
    </div>
  );
}
