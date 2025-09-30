import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import "./theme.css";
import BackgroundWaves from "./components/BackgroundWaves";
import GlassHeader from "./components/GlassHeader";
import SideNav from "./components/SideNav";
import TemplateSelect from "./pages/TemplateSelect";
import TemplatePreview from "./pages/TemplatePreview";
import { applyThemeToRoot, oceanTheme } from "./theme";
import AIChatWidget from "./components/AIChatWizard";
import LandingLogin from "./pages/LandingLogin";
import SOWForm from "./pages/SOWForm";
import ExportWord from "./pages/ExportWord";
import DocxPreviewAndGenerate from "./pages/DocxPreviewAndGenerate";

import tmParsed from "./templates/parsed/tm_template_parsed.json";
import fpParsed from "./templates/parsed/fixed_price_template_parsed.json";

// PUBLIC_INTERFACE
function App() {
  // Stage and step
  const [stage, setStage] = useState("landing"); // landing | builder
  const [current, setCurrent] = useState("template"); // template | sowform | preview | export

  // Selected SOW type: "FP" | "TM"
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Unified SOW JSON (only meta and templateData are relevant to export; other sections are retained for compatibility but not rendered now)
  const [sowData, setSowData] = useState({
    meta: { title: "", client: "", date: "", version: "", prepared_by: "", stakeholders: [], logoUrl: "", logoName: "", signatureUrl: "", sowType: "", templateDocxUrl: "" },
    templateMeta: null,
    templateData: {}
  });

  useEffect(() => {
    applyThemeToRoot(oceanTheme);
  }, []);

  // Update meta for export
  const meta = useMemo(
    () => ({
      title: sowData?.meta?.title || "Statement of Work",
      template: selectedTemplate,
      client: sowData?.meta?.client || "",
      date: sowData?.meta?.date || "",
    }),
    [sowData, selectedTemplate]
  );

  const onRefreshAll = () => {
    setSowData({
      meta: { title: "", client: "", date: "", version: "", prepared_by: "", stakeholders: [], logoUrl: "", logoName: "", signatureUrl: "", sowType: "", templateDocxUrl: "" },
      templateMeta: null,
      templateData: {}
    });
    setSelectedTemplate("");
    setCurrent("template");
  };

  // Derive schema from parsed JSONs strictly by selectedTemplate
  const selectedTemplateSchema = useMemo(() => {
    if (selectedTemplate === "TM") return tmParsed?.parsed || null;
    if (selectedTemplate === "FP") return fpParsed?.parsed || null;
    return null;
  }, [selectedTemplate]);

  // When selectedTemplate changes, set meta.sowType and internal template docx URL hint
  useEffect(() => {
    async function syncDocxUrl() {
      const { getBundledTemplateInfoByType } = await import("./services/bundledTemplates.js");
      const info = getBundledTemplateInfoByType(selectedTemplate);
      setSowData(prev => {
        const next = { ...(prev || {}) };
        next.meta = { ...(next.meta || {}) };
        next.meta.sowType = selectedTemplate || "";
        next.meta.templateDocxUrl = info?.docxUrl || "";
        return next;
      });
    }
    if (selectedTemplate) syncDocxUrl();
  }, [selectedTemplate]);

  const renderStep = () => {
    switch (current) {
      case "template":
        return (
          <>
            <TemplatePreview />
            <div className="panel" style={{ marginTop: 12 }}>
              <TemplateSelect
                selected={selectedTemplate}
                onChange={(id) => {
                  setSelectedTemplate(id);
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn" type="button" onClick={() => setCurrent("sowform")} disabled={!selectedTemplate}>
                  Continue to SOW Form
                </button>
                <button className="btn" type="button" onClick={onRefreshAll} aria-label="Refresh and clear all fields">
                  Refresh / Clear
                </button>
              </div>
            </div>
          </>
        );
      case "sowform":
        return (
          <>
            <SOWForm
              value={sowData}
              onChange={setSowData}
              selectedTemplate={selectedTemplate}
              templateSchema={selectedTemplateSchema}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                onClick={() => setCurrent("preview")}
                disabled={!selectedTemplate || !selectedTemplateSchema}
                title={!selectedTemplate ? "Please select T&M or Fixed Price first." : !selectedTemplateSchema ? "Template fields are not available." : "Preview before generating"}
              >
                Preview
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setCurrent("preview_auto")}
                disabled={!selectedTemplate || !selectedTemplateSchema}
                title="Submit & Export your SOW as a DOCX in one click"
              >
                Submit & Export
              </button>
            </div>
          </>
        );
      case "preview":
        return (
          <DocxPreviewAndGenerate
            data={sowData}
          />
        );
      case "preview_auto":
        return (
          <DocxPreviewAndGenerate
            data={sowData}
            autoGenerate={true}
          />
        );
      case "export":
        return <ExportWord value={sowData} meta={meta} />;
      default:
        return null;
    }
  };

  if (stage === "landing") {
    return <LandingLogin onContinue={() => setStage("builder")} />;
  }

  const currentProjectName = meta.title || "Statement of Work";

  return (
    <>
      <BackgroundWaves />
      <div className="app-shell">
        <GlassHeader
          onSaveDraft={() => {
            localStorage.setItem("sow-data", JSON.stringify(sowData));
            alert("Draft saved locally.");
          }}
        />
        <div className="body-grid" style={{ position: "relative", zIndex: 2 }}>
          <SideNav current={current} onNavigate={setCurrent} />
          <main className="workspace" role="main" aria-live="polite">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button className="btn" type="button" onClick={() => setCurrent("template")}>Template</button>
              <button className="btn" type="button" onClick={() => setCurrent("sowform")}>Form</button>
              <button className="btn" type="button" onClick={() => setCurrent("preview")}>Preview & Generate</button>
              <button className="btn" type="button" onClick={() => setCurrent("export")}>Export (.docx)</button>
              <button className="btn" type="button" onClick={onRefreshAll} aria-label="Refresh and clear all fields">Reset</button>
            </div>
            {renderStep()}
          </main>
        </div>
      </div>

      <AIChatWidget
        projectTitle={currentProjectName}
        position="right"
        onPackage={(payload) => {
          setSowData(payload);
        }}
      />
    </>
  );
}

export default App;
