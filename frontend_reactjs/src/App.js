import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import "./theme.css";
import BackgroundWaves from "./components/BackgroundWaves";
import GlassHeader from "./components/GlassHeader";
import SideNav from "./components/SideNav";
import TemplateSelect from "./pages/TemplateSelect";
import TemplatePreview from "./pages/TemplatePreview";
import GenerateDraft from "./pages/GenerateDraft";
import ReviewEdit from "./pages/ReviewEdit";
import { applyThemeToRoot, oceanTheme } from "./theme";
import AIChatWidget from "./components/AIChatWizard";
import LandingLogin from "./pages/LandingLogin";
import SOWForm from "./pages/SOWForm";
import ExportWord from "./pages/ExportWord";
import PDFTemplateSOW from "./pages/PDFTemplateSOW";
import { getSOWTemplateSchema, scaffoldSOWFromTemplate } from "./templates";

// PUBLIC_INTERFACE
function App() {
  /**
   * App with Landing/Login intro, then SOW builder.
   * AI prompt opens in-page from a right-side icon launcher.
   */
  const [stage, setStage] = useState("landing"); // landing | builder
  const [current, setCurrent] = useState("template"); // start with preview/select
  const [draft, setDraft] = useState("");

  // Selections
  const [templates] = useState([
    { id: "FP", name: "Fixed Price" },
    { id: "TM", name: "Time & Material" },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedTemplateSchema, setSelectedTemplateSchema] = useState(null);

  // Unified SOW JSON (also holds logo/signature)
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

  // When template selection changes, scaffold sowData with the template fields
  useEffect(() => {
    if (!selectedTemplate) {
      setSelectedTemplateSchema(null);
      return;
    }
    const schema = getSOWTemplateSchema(selectedTemplate);
    setSelectedTemplateSchema(schema || null);
    setSowData((prev) => scaffoldSOWFromTemplate(prev, schema));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  const meta = useMemo(
    () => ({
      title: sowData?.meta?.title || "Statement of Work",
      template: selectedTemplate,
      client: sowData?.meta?.client || "",
      date: sowData?.meta?.date || "",
    }),
    [sowData, selectedTemplate]
  );

  const onSaveDraft = () => {
    localStorage.setItem("sow-data", JSON.stringify(sowData));
    // eslint-disable-next-line no-alert
    alert("Draft saved locally.");
  };

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
    setDraft("");
    setCurrent("template");
  };

  const renderStep = () => {
    switch (current) {
      case "template":
        return (
          <>
            <TemplatePreview
              selected={selectedTemplate}
              onSelect={(id) => {
                setSelectedTemplate(id);
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
          <SOWForm
            value={sowData}
            onChange={setSowData}
            selectedTemplate={selectedTemplate}
            templateSchema={selectedTemplateSchema}
          />
        );
      case "generate":
        return (
          <GenerateDraft
            company={{ name: sowData?.meta?.client }}
            project={{ overview: sowData?.background?.project_background, scope: (sowData?.scope?.in_scope || []).join(", "), deliverables: (sowData?.deliverables?.items || []).join(", "), roles: (sowData?.roles?.team || []).join(", "), acceptance: sowData?.deliverables?.acceptance_criteria }}
            template={selectedTemplate}
            onDraft={setDraft}
          />
        );
      case "pdfSow":
        return <PDFTemplateSOW />;
      case "review":
        return (
          <ReviewEdit
            draft={draft}
            onChange={setDraft}
          />
        );
      case "export":
        return <ExportWord value={sowData} meta={meta} draftText={draft} />;
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
          onSaveDraft={onSaveDraft}
        />
        <div className="body-grid" style={{ position: "relative", zIndex: 2 }}>
          <SideNav current={current} onNavigate={setCurrent} />
          <main className="workspace" role="main" aria-live="polite">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <button className="btn" type="button" onClick={() => setCurrent("template")}>Template</button>
              <button className="btn" type="button" onClick={() => setCurrent("sowform")}>Form</button>
              <button className="btn" type="button" onClick={() => setCurrent("generate")}>Generate</button>
              <button className="btn" type="button" onClick={() => setCurrent("review")}>Review</button>
              <button className="btn" type="button" onClick={() => setCurrent("export")}>Export</button>
              <button className="btn" type="button" onClick={onRefreshAll} aria-label="Refresh and clear all fields">Refresh</button>
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
          // Sync wizard data to main SOW form so ExportWord receives it
          setSowData(payload);
        }}
      />
    </>
  );
}

export default App;
