//
// PUBLIC_INTERFACE
// getAvailableSOWTemplates and getSOWTemplateSchema — return JSON schema for dynamic field rendering.
//
import schemas from "./sowTemplateSchemas.json";

/**
 * PUBLIC_INTERFACE
 * getAvailableSOWTemplates
 * Return list of available template descriptors to show in a selector (id, title).
 */
export function getAvailableSOWTemplates() {
  return (schemas?.templates || []).map((t) => ({ id: t.id, title: t.title }));
}

/**
 * PUBLIC_INTERFACE
 * getSOWTemplateSchema
 * Fetch the JSON schema for the given template id.
 */
export function getSOWTemplateSchema(templateId) {
  return (schemas?.templates || []).find((t) => t.id === templateId) || null;
}

/**
 * PUBLIC_INTERFACE
 * getDynamicSchemaFromAttachment
 * Build schema on the fly from provided attachment-based transcripts for specific known template ids:
 * - SOW_TM_SUPPLIER -> attachments T&M
 * - SOW_FIXED_PRICE_SUPPLIER -> attachments Fixed Price
 */
export async function getDynamicSchemaFromAttachment(templateId) {
  const map = {
    SOW_TM_SUPPLIER: { url: '/attachments/20250930_035345_T&M_Supplier_SoW_Template(docx).txt', title: 'Supplier SOW (T&M)' },
    SOW_FIXED_PRICE_SUPPLIER: { url: '/attachments/20250930_035346_Fixed price_Supplier_SoW_Template(docx).txt', title: 'Supplier SOW (Fixed Price)' },
  };
  const arg = map[templateId];
  if (!arg) return null;

  const resp = await fetch(arg.url);
  if (!resp.ok) return null;
  const text = await resp.text();

  const { parseSOWTranscriptToSections, buildDynamicSchemaFromSections } = await import('../services/sowTemplateParser.js');
  const parsed = parseSOWTranscriptToSections(text, { strictTemplateFields: true });
  const schema = buildDynamicSchemaFromSections(parsed, templateId, arg.title, { strictTemplateFields: true });
  return { parsed, schema };
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
  if (!base.templateMeta) base.templateMeta = { id: templateSchema.id, title: templateSchema.title };
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
