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

import { scaffoldSOWFromTemplate } from "./templates"; // kept for base scaffolding if needed

// PUBLIC_INTERFACE
function App() {
  // Stage and step
  const [stage, setStage] = useState("landing"); // landing | builder
  const [current, setCurrent] = useState("template"); // template | sowform | export

  // Selections
  const [templates] = useState([
    { id: "FP", name: "Fixed Price" },
    { id: "TM", name: "Time & Material" },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedTemplateSchema, setSelectedTemplateSchema] = useState(null);

  // Unified SOW JSON (holds meta/logo/signature & dynamic templateData)
  const [sowData, setSowData] = useState({
    meta: { title: "", client: "", date: "", version: "", prepared_by: "", stakeholders: [], logoUrl: "", logoName: "", signatureUrl: "" },
    background: { project_background: "", business_problem: "", objectives: "", success_criteria: "" },
    scope: { in_scope: [], out_of_scope: [], assumptions: [], constraints: [], dependencies: [] },
    deliverables: { items: [], milestones: [], timeline: [], acceptance_criteria: "" },
    roles: { sponsor: "", pm: "", tech_lead: "", team: [], client_responsibilities: "" },
    approach: { solution_overview: "", tech_stack: [], data_sources: [], security: "", qa_strategy: "" },
    governance: { comm_plan: "", reporting: "", meetings: "", risk_mgmt: "", change_control: "" },
    commercials: { pricing_model: "", budget: "", payment_terms: "", invoicing: "" },
    legal: { confidentiality: "", ip: "", sla: "", termination: "", warranties: "" },
    signoff: { signatories: [], date: "" },
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
    // Clear all inputs and reset to template selection
    setSowData({
      meta: { title: "", client: "", date: "", version: "", prepared_by: "", stakeholders: [], logoUrl: "", logoName: "", signatureUrl: "" },
      background: { project_background: "", business_problem: "", objectives: "", success_criteria: "" },
      scope: { in_scope: [], out_of_scope: [], assumptions: [], constraints: [], dependencies: [] },
      deliverables: { items: [], milestones: [], timeline: [], acceptance_criteria: "" },
      roles: { sponsor: "", pm: "", tech_lead: "", team: [], client_responsibilities: "" },
      approach: { solution_overview: "", tech_stack: [], data_sources: [], security: "", qa_strategy: "" },
      governance: { comm_plan: "", reporting: "", meetings: "", risk_mgmt: "", change_control: "" },
      commercials: { pricing_model: "", budget: "", payment_terms: "", invoicing: "" },
      legal: { confidentiality: "", ip: "", sla: "", termination: "", warranties: "" },
      signoff: { signatories: [], date: "" },
      templateMeta: null,
      templateData: {}
    });
    setSelectedTemplate("");
    setSelectedTemplateSchema(null);
    setCurrent("template");
  };

  const renderStep = () => {
    switch (current) {
      case "template":
        return (
          <>
            <TemplatePreview
              selected={selectedTemplate}
              onSelect={(id, runtimeSchema, transcriptText) => {
                setSelectedTemplate(id);
                const schema = runtimeSchema || null;
                setSelectedTemplateSchema(schema);
                setSowData((prev) => {
                  const next = scaffoldSOWFromTemplate(prev, schema);
                  next.templateMeta = { ...(next.templateMeta || {}), transcriptText: transcriptText || "" };
                  return next;
                });
                setCurrent("sowform");
              }}
            />
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
                className="btn btn-primary"
                type="button"
                onClick={() => setCurrent("preview")}
                disabled={
                  !selectedTemplate ||
                  !selectedTemplateSchema ||
                  !(sowData?.templateMeta?.transcriptText && sowData.templateMeta.transcriptText.trim())
                }
                title={
                  !selectedTemplate
                    ? "Please select T&M or Fixed Price first."
                    : !selectedTemplateSchema
                    ? "Template fields are not loaded. Select a template from Preview Templates."
                    : !(sowData?.templateMeta?.transcriptText && sowData.templateMeta.transcriptText.trim())
                    ? "Template source is missing. Select or attach a template to continue."
                    : "Preview & Generate"
                }
              >
                Preview & Generate
              </button>
              {(!selectedTemplate || !selectedTemplateSchema) ? (
                <div style={{ color: "var(--text-secondary)" }}>
                  Select a template above to load its fields. Choose "Fixed Price" or "T&M" in Preview Templates.
                </div>
              ) : !(sowData?.templateMeta?.transcriptText && sowData.templateMeta.transcriptText.trim()) ? (
                <div style={{ color: "var(--text-secondary)" }}>
                  No template content detected. Please select or upload the correct template transcript file.
                </div>
              ) : null}
            </div>
          </>
        );

      case "preview":
        return (
          <DocxPreviewAndGenerate
            transcriptText={sowData?.templateMeta?.transcriptText || ""}
            templateSchema={selectedTemplateSchema}
            data={sowData}
          />
        );
      case "export":
        // Keep legacy export as an optional path if needed
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
          templates={templates}
          selectedTemplate={selectedTemplate}
          onTemplateChange={(id) => {
            setSelectedTemplate(id);
            setCurrent("sowform");
          }}
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

      {/* Right-side floating AI icon that opens the in-page prompt panel */}
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
