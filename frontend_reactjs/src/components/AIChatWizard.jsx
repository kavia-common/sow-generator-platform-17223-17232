import React, { useEffect, useMemo, useRef, useState } from "react";
import { applyThemeToRoot, oceanTheme } from "../theme";
import "./AIChatWizard.css";

/**
 * PUBLIC_INTERFACE
 * AIChatWizard
 * Conversational SOW wizard that:
 * - Greets on first open and offers: Generate SOW or Provide project details/title
 * - Asks one question at a time, suggests defaults from title/details
 * - Supports uploads with inline preview (logo, signature, photo)
 * - Packages all answers as SOW JSON for ExportWord
 * - Styled to match the neon/dark theme and replaces the previous AI prompt
 */
export default function AIChatWizard({ projectTitle = "", position = "right", onPackage }) {
  const [open, setOpen] = useState(false);

  // Conversation state
  const [messages, setMessages] = useState(() => {
    const cached = localStorage.getItem("sow-wizard-chat");
    return cached ? JSON.parse(cached) : [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Collected SOW data
  const [sow, setSow] = useState(() => {
    const cached = localStorage.getItem("sow-wizard-data");
    return cached
      ? JSON.parse(cached)
      : {
          meta: {
            title: "",
            client: "",
            email: "",
            date: "",
            version: "",
            prepared_by: "",
            stakeholders: [],
            logoUrl: "",
            logoName: "",
            photoUrl: "",
            signatureUrl: "",
          },
          background: { project_background: "", business_problem: "", objectives: "", success_criteria: "" },
          scope: { in_scope: [], out_of_scope: [], assumptions: [], constraints: [], dependencies: [] },
          deliverables: { items: [], milestones: [], timeline: [], acceptance_criteria: "" },
          roles: { sponsor: "", pm: "", tech_lead: "", team: [], client_responsibilities: "" },
          approach: { solution_overview: "", tech_stack: [], data_sources: [], security: "", qa_strategy: "" },
          governance: { comm_plan: "", reporting: "", meetings: "", risk_mgmt: "", change_control: "" },
          commercials: { pricing_model: "", budget: "", payment_terms: "", invoicing: "" },
          legal: { confidentiality: "", ip: "", sla: "", termination: "", warranties: "" },
          signoff: { signatories: [], date: "" },
        };
  });

  // Wizard steps: ask a single question at a time
  const steps = useMemo(
    () => [
      { key: "start", prompt: "Welcome! Would you like to 1) Generate a SOW now or 2) Provide your project title and details first?", type: "choice", options: ["Generate SOW", "Provide details"] },
      { key: "title", prompt: "What is the project title?", type: "text", target: ["meta", "title"], suggestFrom: "projectTitle" },
      { key: "details", prompt: "Briefly describe the project objectives.", type: "text", target: ["background", "objectives"] },
      { key: "client", prompt: "Client or organization name?", type: "text", target: ["meta", "client"] },
      { key: "email", prompt: "Client email for the SOW?", type: "text", target: ["meta", "email"], validate: "email" },
      { key: "prepared_by", prompt: "Who is preparing this SOW?", type: "text", target: ["meta", "prepared_by"] },
      { key: "date", prompt: "SOW date (YYYY-MM-DD)?", type: "date", target: ["meta", "date"] },
      { key: "logo", prompt: "Upload a company logo (optional).", type: "upload", target: ["meta", "logoUrl"], label: "Choose Logo" },
      { key: "photo", prompt: "Add a project photo or image (optional).", type: "upload", target: ["meta", "photoUrl"], label: "Choose Photo" },
      { key: "signature", prompt: "Upload a signature image for sign-off (optional).", type: "upload", target: ["meta", "signatureUrl"], label: "Upload Signature" },
      { key: "sponsor", prompt: "Who is the project sponsor?", type: "text", target: ["roles", "sponsor"] },
      { key: "pm", prompt: "Project manager name?", type: "text", target: ["roles", "pm"] },
      { key: "tech_lead", prompt: "Technical lead name?", type: "text", target: ["roles", "tech_lead"] },
      { key: "in_scope", prompt: "List one in-scope item (you can add more later).", type: "text-list-once", target: ["scope", "in_scope"] },
      { key: "deliverables", prompt: "Provide one key deliverable (you can add more later).", type: "text-list-once", target: ["deliverables", "items"] },
      { key: "timeline", prompt: "Provide a brief timeline note or milestone.", type: "text-list-once", target: ["deliverables", "timeline"] },
      { key: "acceptance", prompt: "Acceptance criteria summary?", type: "text", target: ["deliverables", "acceptance_criteria"] },
      { key: "signoff_date", prompt: "Sign-off date (optional, YYYY-MM-DD).", type: "date", target: ["signoff", "date"] },
      { key: "signatories", prompt: "Add a signatory name (you can add more later).", type: "text-list-once", target: ["signoff", "signatories"] },
      { key: "finish", prompt: "All set. Should I package your SOW for export now?", type: "choice", options: ["Yes, package for export", "Review in the form first"] },
    ],
    []
  );

  const [stepIndex, setStepIndex] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    applyThemeToRoot(oceanTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("sow-wizard-data", JSON.stringify(sow));
  }, [sow]);

  useEffect(() => {
    localStorage.setItem("sow-wizard-chat", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    // Seed greeting when first opened
    if (open && messages.length === 0) {
      pushBot("Hello! I’m your SOW assistant. I’ll ask a few quick questions—one at a time.");
      const s = steps[0];
      pushBot(s.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const headerTitle = (sow?.meta?.title || projectTitle || "Statement of Work").trim();

  function pushBot(text) {
    setMessages((prev) => [...prev, { from: "bot", text }]);
  }
  function pushUser(text) {
    setMessages((prev) => [...prev, { from: "user", text }]);
  }

  function setValue(path, value) {
    setSow((prev) => {
      const next = structuredClone(prev);
      let o = next;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        if (!(k in o)) o[k] = {};
        o = o[k];
      }
      o[path[path.length - 1]] = value;
      return next;
    });
  }
  function pushToList(path, value) {
    if (!value) return;
    setSow((prev) => {
      const next = structuredClone(prev);
      let o = next;
      for (let i = 0; i < path.length - 1; i++) {
        o = o[path[i]];
      }
      if (!Array.isArray(o[path[path.length - 1]])) o[path[path.length - 1]] = [];
      o[path[path.length - 1]].push(value);
      return next;
    });
  }

  function nextStep() {
    const next = Math.min(stepIndex + 1, steps.length - 1);
    setStepIndex(next);
    const s = steps[next];
    if (s) {
      if (s.key === "title") {
        const suggested = (projectTitle || "").trim();
        if (suggested) pushBot(`Suggested title: “${suggested}”`);
      }
      pushBot(s.prompt);
    }
  }

  function validate(value, rule) {
    if (!rule) return true;
    if (rule === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    const current = steps[stepIndex];
    if (!current) return;

    if (["upload"].includes(current.type)) return;

    const val = input.trim();
    if (!val && current.type !== "choice") return;

    pushUser(val || "(skip)");
    setInput("");
    setLoading(true);

    try {
      if (current.type === "choice") {
        pushUser(val);
        if (current.key === "start") {
          nextStep();
        } else if (current.key === "finish") {
          if (/yes/i.test(val)) {
            packageForExport();
            pushBot("Packaging complete. You can export under Export Word (.docx).");
          } else {
            pushBot("Okay. You can review and edit in the SOW Form anytime.");
          }
        } else {
          nextStep();
        }
      } else if (current.type === "text") {
        if (current.validate && !validate(val, current.validate)) {
          pushBot("That doesn't look valid. Please try again.");
        } else {
          if (current.target) setValue(current.target, val);
          nextStep();
        }
      } else if (current.type === "text-list-once") {
        if (current.target) pushToList(current.target, val);
        nextStep();
      } else if (current.type === "date") {
        if (current.target) setValue(current.target, val);
        nextStep();
      } else {
        nextStep();
      }
    } finally {
      setLoading(false);
    }
  }

  function onUploadSelected(file, targetKey) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setValue(targetKey, reader.result);
      pushBot("Upload received. Preview updated.");
      nextStep();
    };
    reader.readAsDataURL(file);
  }

  function packageForExport() {
    onPackage?.(sow);
    localStorage.setItem("sow-wizard-data", JSON.stringify(sow));
  }

  const current = steps[stepIndex] || {};
  const rightPos = position !== "left";

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="ai-wizard"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close SOW Wizard" : "Open SOW Wizard"}
        title={open ? "Close SOW Wizard" : "Open SOW Wizard"}
        className={`wiz-fab ${rightPos ? "" : "left"}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 4v-4.5A3.5 3.5 0 0 1 4 12V7Z" stroke="white" strokeWidth="1.6" fill="rgba(255,255,255,0.12)"/>
          <path d="M17.5 3.5l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8Z" fill="white"/>
        </svg>
      </button>

      <div
        id="ai-wizard"
        role="dialog"
        aria-modal="false"
        aria-label="SOW Wizard"
        className={`wiz-panel ${open ? "open" : ""}`}
      >
        <div className="wiz-header">
          <div className="wiz-header-title">
            <div className="wiz-overline">SOW Wizard</div>
            <div className="wiz-title" title={headerTitle}>{headerTitle}</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn"
            style={{ background: "#fff", color: "#374151" }}
            aria-label="Close"
            title="Close"
          >
            Close
          </button>
        </div>

        <div className="wiz-body">
          {/* Chat transcript */}
          <div role="log" aria-live="polite" className="wiz-log">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`wiz-bubble ${m.from === "user" ? "user" : "bot"}`}
              >
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Current step special UIs for upload/preview */}
          {current?.type === "upload" && (
            <div className="wiz-upload">
              <div style={{ marginBottom: 8 }}>{current.prompt}</div>
              <label className="btn" style={{ background: "#fff", color: "#374151" }}>
                {current.label || "Choose File"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadSelected(file, current.target);
                  }}
                />
              </label>
              <div className="wiz-previews">
                {current.key === "logo" && sow?.meta?.logoUrl ? (
                  <img alt="Logo preview" src={sow.meta.logoUrl} className="wiz-preview-img" style={{ maxHeight: 56 }} />
                ) : null}
                {current.key === "photo" && sow?.meta?.photoUrl ? (
                  <img alt="Photo preview" src={sow.meta.photoUrl} className="wiz-preview-img" style={{ maxHeight: 100 }} />
                ) : null}
                {current.key === "signature" && sow?.meta?.signatureUrl ? (
                  <img alt="Signature preview" src={sow.meta.signatureUrl} className="wiz-preview-img" style={{ maxHeight: 64, background: "#fff" }} />
                ) : null}
              </div>
            </div>
          )}

          {/* Text/choice input */}
          {current?.type !== "upload" && (
            <form onSubmit={handleSubmit} aria-label="Wizard input" className="wiz-input-row">
              <input
                className="wiz-input"
                placeholder={
                  current?.type === "choice"
                    ? "Type your choice (e.g., 1 or Yes)"
                    : "Type your answer"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "..." : "Send"}
              </button>
            </form>
          )}

          {/* Package/Export helper */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn"
              type="button"
              onClick={() => {
                packageForExport();
                pushBot("SOW packaged. Head to Export Word (.docx) to download.");
              }}
              style={{ background: "#fff", color: "#374151" }}
              title="Make available to Export step"
            >
              Package for Export
            </button>
          </div>
        </div>

        <div className="wiz-footer">
          I’ll guide you through just the essentials. You can refine everything in the SOW Form.
        </div>
      </div>
    </>
  );
}
