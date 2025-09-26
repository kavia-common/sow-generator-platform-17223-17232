//
// PUBLIC_INTERFACE
// getAvailableSOWTemplates and getSOWTemplateSchema — return JSON schema for dynamic field rendering.
// Also provides a lightweight local Template Manager with Draft support (add/list/delete),
// persisted in localStorage so users can manage drafts without a backend yet.
//
import schemas from "./sowTemplateSchemas.json";

const DRAFT_KEY = "sow-template-drafts:v1";

/**
 * Load draft templates from localStorage.
 * A draft is a minimal object: { id, title, status: 'draft', schema }
 */
function loadDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Persist drafts to localStorage
 */
function saveDrafts(drafts) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts || []));
  } catch {
    // ignore
  }
}

/**
 * PUBLIC_INTERFACE
 * getAvailableSOWTemplates
 * Return list of available template descriptors to show in a selector (id, title, status?).
 * Includes built-in templates and user drafts.
 */
export function getAvailableSOWTemplates() {
  const builtins = (schemas?.templates || []).map((t) => ({
    id: t.id,
    title: t.title,
    status: "published",
    isDraft: false
  }));
  const drafts = loadDrafts().map((d) => ({
    id: d.id,
    title: d.title || d.schema?.title || d.id,
    status: d.status || "draft",
    isDraft: true
  }));
  // Combine, avoid id collisions (drafts can shadow if same id)
  const byId = new Map();
  [...builtins, ...drafts].forEach((t) => byId.set(t.id, t));
  return Array.from(byId.values());
}

/**
 * PUBLIC_INTERFACE
 * getSOWTemplateSchema
 * Fetch the JSON schema for the given template id, including drafts.
 */
export function getSOWTemplateSchema(templateId) {
  // First look in built-ins
  const builtin = (schemas?.templates || []).find((t) => t.id === templateId);
  if (builtin) return builtin;
  // Then drafts
  const drafts = loadDrafts();
  const hit = drafts.find((d) => d.id === templateId);
  return hit?.schema || null;
}

/**
 * PUBLIC_INTERFACE
 * addDraftTemplate
 * Add a new draft template (id, title, schema fields) to local storage.
 */
export function addDraftTemplate({ id, title, schema }) {
  if (!id || !schema) throw new Error("id and schema are required to create a draft template.");
  const drafts = loadDrafts();
  const existsIdx = drafts.findIndex((d) => d.id === id);
  const draftObj = { id, title: title || schema?.title || id, status: "draft", schema };
  if (existsIdx >= 0) drafts[existsIdx] = draftObj;
  else drafts.push(draftObj);
  saveDrafts(drafts);
  return draftObj;
}

/**
 * PUBLIC_INTERFACE
 * deleteTemplate
 * Delete a template by id. This supports only drafts for deletion; published templates cannot be removed.
 * Returns true if removed, false if not found or not deletable.
 */
export function deleteTemplate(templateId) {
  const drafts = loadDrafts();
  const before = drafts.length;
  const after = drafts.filter((d) => d.id !== templateId);
  if (after.length !== before) {
    saveDrafts(after);
    return true;
  }
  // not a draft; cannot delete published/builtin here
  return false;
}

/**
 * PUBLIC_INTERFACE
 * listAllTemplates
 * Convenience to return combined detailed objects for selection UIs.
 */
export function listAllTemplates() {
  const builtins = (schemas?.templates || []).map((t) => ({
    id: t.id,
    title: t.title,
    status: "published",
    isDraft: false,
    schema: t
  }));
  const drafts = loadDrafts().map((d) => ({
    id: d.id,
    title: d.title || d.schema?.title || d.id,
    status: "draft",
    isDraft: true,
    schema: d.schema
  }));
  return [...builtins, ...drafts];
}

/**
 * PUBLIC_INTERFACE
 * scaffoldSOWFromTemplate
 * Given an existing SOW JSON (may be empty) and a template schema, initialize/merge
 * fields that are required by the template so UI can render them.
 * Returns a shallow extension with a `templateData` top-level namespace to store template-specific values.
 */
export function scaffoldSOWFromTemplate(currentSOW, templateSchema) {
  const base = currentSOW && typeof currentSOW === "object" ? structuredClone(currentSOW) : {};
  if (!templateSchema) return base;
  if (!base.templateMeta) base.templateMeta = { id: templateSchema.id, title: templateSchema.title, status: templateSchema.status || "published" };
  if (!base.templateData) base.templateData = {};

  // Create empty structures for required fields if missing
  (templateSchema.fields || []).forEach((f) => {
    if (f.type === "object") {
      if (!base.templateData[f.key]) base.templateData[f.key] = {};
      (f.properties || []).forEach((p) => {
        if (base.templateData[f.key][p.key] === undefined) {
          base.templateData[f.key][p.key] = defaultForType(p.type);
        }
      });
    } else if (f.type === "table") {
      if (!base.templateData[f.key]) base.templateData[f.key] = [];
    } else {
      if (base.templateData[f.key] === undefined) {
        base.templateData[f.key] = defaultForType(f.type);
      }
    }
  });

  return base;
}

function defaultForType(t) {
  switch (t) {
    case "text":
    case "textarea":
    case "date":
    case "email":
    case "currency":
      return "";
    case "select":
      return "";
    case "list":
      return [];
    case "upload-list":
      return [];
    case "checkbox":
      return false;
    case "object":
      return {};
    case "table":
      return [];
    default:
      return "";
  }
}
