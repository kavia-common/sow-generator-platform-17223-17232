//
// PUBLIC_INTERFACE
// runTemplateParsing
// Utility to parse the embedded transcript attachments (T&M and Fixed Price) at runtime and
// return their structured sections and dynamic schema for use by the UI.
// This does not perform file I/O persistence; it returns JS objects.
//
import { parseSOWTranscriptToSections, buildDynamicSchemaFromSections } from './sowTemplateParser';

/**
 * PUBLIC_INTERFACE
 * parseBuiltinTemplates
 * Parse known attached templates and return an index of { id, title, sections, schema }.
 * @returns {Promise<Array<{id:string,title:string,sections:any,schema:any, meta:any}>>}
 */
export async function parseBuiltinTemplates() {
  const results = [];

  const tmUrl = '/attachments/20250930_035345_T&M_Supplier_SoW_Template(docx).txt';
  const fpUrl = '/attachments/20250930_035346_Fixed price_Supplier_SoW_Template(docx).txt';

  for (const item of [
    { id: 'SOW_TM_SUPPLIER', title: 'Supplier SOW (T&M)', url: tmUrl },
    { id: 'SOW_FIXED_PRICE_SUPPLIER', title: 'Supplier SOW (Fixed Price)', url: fpUrl },
  ]) {
    try {
      const resp = await fetch(item.url);
      if (!resp.ok) throw new Error(`Failed to load ${item.url}`);
      const text = await resp.text();
      const parsed = parseSOWTranscriptToSections(text);
      const schema = buildDynamicSchemaFromSections(parsed, item.id, item.title);
      results.push({ id: item.id, title: item.title, sections: parsed.sections, schema, meta: parsed.meta });
    } catch (e) {
      console.error('Template parse error:', item, e);
    }
  }

  return results;
}
