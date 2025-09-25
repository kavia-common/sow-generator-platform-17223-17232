import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import "./theme.css";
import BackgroundWaves from "./components/BackgroundWaves";
import GlassHeader from "./components/GlassHeader";
import SideNav from "./components/SideNav";
import CompanyDetails from "./pages/CompanyDetails";
import ProjectDetails from "./pages/ProjectDetails";
import TemplateSelect from "./pages/TemplateSelect";
import GenerateDraft from "./pages/GenerateDraft";
import ReviewEdit from "./pages/ReviewEdit";
import ExportPDF from "./pages/ExportPDF";
import { applyThemeToRoot, oceanTheme } from "./theme";
import AIChatWidget from "./components/AIChatWidget";

// PUBLIC_INTERFACE
function App() {
  /**
   * SOW Generator App Shell
   * - Glassmorphic top navigation with pill/blur
   * - Neon full-bleed background
   * - Side navigation for SOW steps
   * - Main workspace for forms and review
   * - Bottom-left AI chat widget that opens in-page panel
   */
  const [current, setCurrent] = useState("company");

  // Selections
  // Removed "New Project" semantics; we keep a single current project selection list but avoid "new" actions
  const [projects] = useState([{ id: "p1", name: "Current Project" }]);
  const [templates] = useState([
    { id: "FP", name: "Fixed Price" },
    { id: "TM", name: "Time & Material" },
  ]);
  const [selectedProject, setSelectedProject] = useState("p1");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Data models
  const [company, setCompany] = useState({});
  const [project, setProject] = useState({});
  const [draft, setDraft] = useState("");

  useEffect(() => {
    applyThemeToRoot(oceanTheme);
  }, []);

  const meta = useMemo(
    () => ({
      title: project?.overview?.slice(0, 30) || "Statement of Work",
      template: selectedTemplate,
    }),
    [project?.overview, selectedTemplate]
  );

  const onSaveDraft = () => {
    // For MVP, just notify; full impl could persist draft to Supabase
    // eslint-disable-next-line no-alert
    alert("Draft saved locally. Use Export to save to Supabase.");
  };

  const renderStep = () => {
    switch (current) {
      case "company":
        return <CompanyDetails data={company} onChange={setCompany} />;
      case "project":
        return <ProjectDetails data={project} onChange={setProject} />;
      case "template":
        return (
          <TemplateSelect
            selected={selectedTemplate}
            onChange={setSelectedTemplate}
          />
        );
      case "generate":
        return (
          <GenerateDraft
            company={company}
            project={project}
            template={selectedTemplate}
            onDraft={setDraft}
          />
        );
      case "review":
        return <ReviewEdit draft={draft} onChange={setDraft} />;
      case "export":
        return <ExportPDF draft={draft} meta={meta} />;
      default:
        return null;
    }
  };

  // Compute current project title to display inside AI widget
  const currentProjectName =
    projects.find((p) => p.id === selectedProject)?.name ||
    project?.overview?.slice(0, 30) ||
    "Current Project";

  return (
    <>
      <BackgroundWaves />
      <div className="app-shell">
        <GlassHeader
          projects={projects}
          templates={templates}
          selectedProject={selectedProject}
          selectedTemplate={selectedTemplate}
          onProjectChange={setSelectedProject}
          onTemplateChange={setSelectedTemplate}
          // Remove New action from header
          onNewProject={undefined}
          onSaveDraft={onSaveDraft}
        />

        {/* Remove Hero CTA "Start a new SOW" and other add-new triggers */}
        {/* Keep a subtle header-less space or remove hero entirely; choose to remove to reduce clutter */}
        <div className="body-grid" style={{ position: "relative", zIndex: 2 }}>
          <SideNav current={current} onNavigate={setCurrent} />
          <main className="workspace" role="main" aria-live="polite">
            {renderStep()}
          </main>
        </div>
      </div>

      {/* Bottom-left floating AI icon that opens the in-page prompt panel */}
      <AIChatWidget projectTitle={currentProjectName} />
    </>
  );
}

export default App;
