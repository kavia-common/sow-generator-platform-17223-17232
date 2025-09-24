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
import Hero from "./components/Hero";
import Login from "./pages/Login";
import { applyThemeToRoot, oceanTheme } from "./theme";

// PUBLIC_INTERFACE
function App() {
  /**
   * SOW Generator App Shell
   * - Glassmorphic top navigation with pill/blur
   * - Neon full-bleed background
   * - Side navigation for SOW steps
   * - Main workspace for forms and review
   */
  const [current, setCurrent] = useState("company");

  // Selections
  const [projects, setProjects] = useState([{ id: "p1", name: "New Project" }]);
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

  // Simple hash-based toggle to view Login page: add #login to URL
  const [showLogin, setShowLogin] = useState(() => window.location.hash === "#login");
  useEffect(() => {
    const onHash = () => setShowLogin(window.location.hash === "#login");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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

  const onNewProject = () => {
    const id = `p${projects.length + 1}`;
    setProjects([...projects, { id, name: `Project ${projects.length + 1}` }]);
    setSelectedProject(id);
  };

  const onSaveDraft = () => {
    // For MVP, just notify; full impl could persist draft to Supabase
    // eslint-disable-next-line no-alert
    alert("Draft saved locally. Use Export to save to Supabase.");
  };

  const gotoTemplates = () => setCurrent("template");
  const startNew = () => {
    onNewProject();
    setCurrent("company");
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

  if (showLogin) {
    // Render the new Login page in Ocean Professional style
    return <Login />;
  }

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
          onNewProject={onNewProject}
          onSaveDraft={onSaveDraft}
        />

        {/* Hero on first load or always as brand intro */}
        <Hero onPrimary={startNew} onSecondary={gotoTemplates} />
        <div style={{ textAlign: "center", marginTop: -8, marginBottom: 8, zIndex: 2, position: "relative" }}>
          <a
            href="#login"
            className="btn"
            style={{
              display: "inline-block",
              marginTop: 8,
              borderRadius: 999,
              padding: "8px 12px",
              background: "var(--ui-fill)",
              border: "1px solid var(--ui-border)",
              color: "var(--text-primary)"
            }}
            title="Open Login page with AI Prompt"
          >
            Open Login + AI Prompt
          </a>
        </div>

        <div className="body-grid" style={{ position: "relative", zIndex: 2 }}>
          <SideNav current={current} onNavigate={setCurrent} />
          <main className="workspace" role="main" aria-live="polite">
            {renderStep()}
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
