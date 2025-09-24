import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import TopNav from "./components/TopNav";
import SideNav from "./components/SideNav";
import CompanyDetails from "./pages/CompanyDetails";
import ProjectDetails from "./pages/ProjectDetails";
import TemplateSelect from "./pages/TemplateSelect";
import GenerateDraft from "./pages/GenerateDraft";
import ReviewEdit from "./pages/ReviewEdit";
import ExportPDF from "./pages/ExportPDF";
import { applyThemeToRoot, oceanTheme } from "./theme";

// PUBLIC_INTERFACE
function App() {
  /**
   * SOW Generator App Shell
   * - Top navigation for project/template selection
   * - Side navigation for SOW actions/steps
   * - Main workspace for forms and review
   */
  const [current, setCurrent] = useState("company");

  // selections
  const [projects, setProjects] = useState([{ id: "p1", name: "New Project" }]);
  const [templates] = useState([{ id: "FP", name: "Fixed Price" }, { id: "TM", name: "Time & Material" }]);
  const [selectedProject, setSelectedProject] = useState("p1");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // data models
  const [company, setCompany] = useState({});
  const [project, setProject] = useState({});
  const [draft, setDraft] = useState("");

  useEffect(() => {
    applyThemeToRoot(oceanTheme);
  }, []);

  const meta = useMemo(() => ({
    title: project?.overview?.slice(0, 30) || "Statement of Work",
    template: selectedTemplate
  }), [project?.overview, selectedTemplate]);

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

  const renderStep = () => {
    switch (current) {
      case "company":
        return <CompanyDetails data={company} onChange={setCompany} />;
      case "project":
        return <ProjectDetails data={project} onChange={setProject} />;
      case "template":
        return <TemplateSelect selected={selectedTemplate} onChange={setSelectedTemplate} />;
      case "generate":
        return <GenerateDraft company={company} project={project} template={selectedTemplate} onDraft={setDraft} />;
      case "review":
        return <ReviewEdit draft={draft} onChange={setDraft} />;
      case "export":
        return <ExportPDF draft={draft} meta={meta} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <TopNav
        projects={projects}
        templates={templates}
        selectedProject={selectedProject}
        selectedTemplate={selectedTemplate}
        onProjectChange={setSelectedProject}
        onTemplateChange={setSelectedTemplate}
        onNewProject={onNewProject}
        onSaveDraft={onSaveDraft}
      />

      <div className="body-grid">
        <SideNav current={current} onNavigate={setCurrent} />
        <main className="workspace" role="main" aria-live="polite">
          {renderStep()}
        </main>
      </div>
    </div>
  );
}

export default App;
