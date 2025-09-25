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
import { applyThemeToRoot, oceanTheme } from "./theme";
import AIChatWidget from "./components/AIChatWidget";
import LandingLogin from "./pages/LandingLogin";
import SOWForm from "./pages/SOWForm";
import ExportWord from "./pages/ExportWord";

// PUBLIC_INTERFACE
function App() {
  /**
   * App with Landing/Login intro, then SOW builder.
   * AI prompt opens in-page from a right-side icon launcher.
   */
  const [stage, setStage] = useState("landing"); // landing | builder
  const [current, setCurrent] = useState("sowform"); // default to new SOW form

  // Selections
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
  const [sowData, setSowData] = useState(null); // full SOW JSON (all sections), including logo file/url

  useEffect(() => {
    applyThemeToRoot(oceanTheme);
  }, []);

  const meta = useMemo(
    () => ({
      title:
        sowData?.meta?.title ||
        project?.overview?.slice(0, 30) ||
        "Statement of Work",
      template: selectedTemplate,
      client: sowData?.meta?.client || company?.name || "",
      date: sowData?.meta?.date || "",
    }),
    [sowData, project?.overview, selectedTemplate, company?.name]
  );

  const onSaveDraft = () => {
    // eslint-disable-next-line no-alert
    alert("Draft saved locally.");
  };

  const renderStep = () => {
    switch (current) {
      case "sowform":
        return <SOWForm value={sowData} onChange={setSowData} />;
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
        return <ExportWord value={sowData} meta={meta} />;
      default:
        return null;
    }
  };

  const currentProjectName =
    projects.find((p) => p.id === selectedProject)?.name ||
    meta.title ||
    "Current Project";

  if (stage === "landing") {
    return <LandingLogin onContinue={() => setStage("builder")} />;
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
          onNewProject={undefined}
          onSaveDraft={onSaveDraft}
        />
        <div className="body-grid" style={{ position: "relative", zIndex: 2 }}>
          <SideNav current={current} onNavigate={setCurrent} />
          <main className="workspace" role="main" aria-live="polite">
            {renderStep()}
          </main>
        </div>
      </div>

      {/* Right-side floating AI icon that opens the in-page prompt panel */}
      <AIChatWidget projectTitle={currentProjectName} position="right" />
    </>
  );
}

export default App;
