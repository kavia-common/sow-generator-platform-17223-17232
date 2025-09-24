import React from "react";

// PUBLIC_INTERFACE
export default function TopNav({ projects, templates, selectedProject, selectedTemplate, onProjectChange, onTemplateChange, onNewProject, onSaveDraft }) {
  /** Top Navigation for project/template selection and quick actions */
  return (
    <header className="topnav">
      <div className="brand" aria-label="SOW Generator">
        <span className="dot" />
        <span>SOW Generator</span>
      </div>

      <div className="selector" role="group" aria-label="Project and Template selectors">
        <select
          className="select"
          value={selectedProject || ""}
          onChange={(e) => onProjectChange?.(e.target.value)}
          aria-label="Select Project"
        >
          <option value="" disabled>Select Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          className="select"
          value={selectedTemplate || ""}
          onChange={(e) => onTemplateChange?.(e.target.value)}
          aria-label="Select Template"
        >
          <option value="" disabled>Select Template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <button className="btn secondary" onClick={onNewProject}>New Project</button>
        <button className="btn primary" onClick={onSaveDraft}>Save Draft</button>
      </div>

      <div className="spacer" />

      <div className="userbox" title="User menu">
        <span role="img" aria-label="user">👤</span>
        <span>Guest</span>
      </div>
    </header>
  );
}
