//
//
// PUBLIC_INTERFACE
// SOW Template Parser: Extracts sections, headers, and fields from DOCX transcript .txt files.
// In STRICT mode (default), it only surfaces placeholders that actually exist in the template.
// It avoids adding inferred fields/sections like Authorization, Stakeholders, etc., unless
// strictTemplateFields is explicitly set to false.
//
//

/**
 * PUBLIC_INTERFACE
 * parseSOWTranscriptToSections
 * Parse a transcript of a DOCX SOW template (.txt) into an ordered section list with fields.
 * - Recognizes numbered sections "^\s*\d+\.\s+Title:"
 * - Recognizes headers like "Statement of Work", "Authorization", etc.
 * - Extracts placeholders [Field], <Field>, and categorizes fields as "text", "textarea", "list", "date", "email", "currency"
 * - Converts bullet lines (•, -, \uf0b7) into listItems (UI hint only; does not create fields in strict mode)
 *
 * @param {string} transcriptText - Plain text extracted from DOCX
 * @param {object} [options] - Parsing options
 *   - strictTemplateFields?: boolean (default: true) When true, do not add any inferred fields.
 * @returns {{
 *   sections: Array<{
 *     index?: number,
 *     title: string,
 *     lines: string[],
 *     fields: Array<{key:string,label:string,type:string,source:'auto'|'inferred'}>,
 *     listItems?: string[],
 *   }>,
 *   flatFields: Array<{key:string,label:string,type:string,section?:string}>,
 *   meta: { detectedTemplateType: 'T&M'|'Fixed Price'|'Unknown' }
 * }}
 */
export function parseSOWTranscriptToSections(transcriptText, options = {}) {
  const { strictTemplateFields = true } = options;

  const text = normalizeEols(String(transcriptText || ''));
  const lines = text.split('\n');

  const sections = [];
  let current = null;

  const numberedSectionRe = /^\s*(\d+)\.\s+(.+?)(:)?\s*$/;
  const headerRe = /^\s*(Statement of Work.*|Work Order.*|Authorization.*|Scope of Work.*|Master Services Agreement.*)\s*$/i;
  const bulletRe = /^\s*(?:[-*\u2022\u2022\u25CF]|\uf0b7)\s+(.*)\s*$/;

  function startSection(title, index) {
    if (current) sections.push(finalizeSection(current));
    current = { title: title.trim(), index: typeof index === 'number' ? index : undefined, lines: [], fields: [], listItems: [] };
  }
  function pushLine(l) {
    if (!current) startSection('Preamble');
    current.lines.push(l);
    // Detect bullets into listItems (UI hint only)
    const m = l.match(bulletRe);
    if (m && m[1]) {
      current.listItems.push(m[1].trim());
    }
    // Extract placeholders from line
    extractPlaceholdersFromLine(l, { strictTemplateFields }).forEach((f) => ensureField(current.fields, f));
  }
  function finalizeSection(sec) {
    if (!strictTemplateFields) {
      // Optional legacy augmentations when not strict (kept behind flag)
      if (sec.listItems && sec.listItems.length > 0) {
        const label = sec.title;
        const key = normalizeKey(`${label}_list`);
        ensureField(sec.fields, { key, label: `${label} (List)`, type: 'list', source: 'inferred' });
      }

      const hasStartDate = sec.lines.some((l) => /start date\s*:?(\s*)$/i.test(l) || /\[start date\]/i.test(l));
      const hasEndDate = sec.lines.some((l) => /end date\s*:?(\s*)$/i.test(l) || /\[end date\]/i.test(l));
      if (hasStartDate || hasEndDate) {
        ensureField(sec.fields, { key: normalizeKey(`${sec.title}_duration`), label: 'Project Duration', type: 'object', source: 'inferred' });
      }

      const t = sec.title.toLowerCase();
      if ((/scope/.test(t) || /charges/.test(t) || /payment/.test(t) || /change control/.test(t)) && !sec.fields.some((f) => f.type === 'textarea')) {
        ensureField(sec.fields, { key: normalizeKey(sec.title), label: sec.title, type: 'textarea', source: 'inferred' });
      }

      if (sec.fields.length === 0) {
        ensureField(sec.fields, { key: normalizeKey(sec.title), label: sec.title, type: 'text', source: 'inferred' });
      }
    }
    return sec;
  }

  // Iterate lines and segment into sections
  lines.forEach((raw) => {
    const line = raw.trimEnd();
    const n = line.match(numberedSectionRe);
    if (n) {
      startSection(n[2], parseInt(n[1], 10));
      return;
    }
    if (headerRe.test(line) && !/^\s*\d+\.\s*/.test(line)) {
      startSection(line.replace(/\s+To\s+$/i, '').trim());
      return;
    }
    pushLine(line);
  });
  if (current) sections.push(finalizeSection(current));

  // Normalize duplicates and gather a flat fields list with section reference
  const flatMap = new Map();
  sections.forEach((sec) => {
    (sec.fields || []).forEach((f) => {
      const k = f.key;
      if (!flatMap.has(k)) {
        flatMap.set(k, { ...f, section: sec.title });
      }
    });
  });

  // Template type detection heuristics (metadata only)
  const lc = text.toLowerCase();
  let detected = 'Unknown';
  if (lc.includes('time & materials') || lc.includes('t&m') || lc.includes('charges & payment terms (t&m)')) {
    detected = 'T&M';
  } else if (lc.includes('fixed price') || lc.includes('charges & payment schedule (fixed price')) {
    detected = 'Fixed Price';
  }

  if (!strictTemplateFields) {
    // Optional known-section enhancements only when not strict
    enhanceKnownSections(sections);
  }

  return {
    sections,
    flatFields: Array.from(flatMap.values()),
    meta: { detectedTemplateType: detected },
  };
}

/**
 * PUBLIC_INTERFACE
 * buildDynamicSchemaFromSections
 * Convert parsed sections to dynamic form schema that the UI (SOWForm) can render.
 * Keeps section grouping via "object" fields when appropriate.
 *
 * @param {{sections:Array}} parsed
 * @param {string} templateId
 * @param {string} title
 * @param {object} [options] - { strictTemplateFields?: boolean }
 * @returns {{id:string,title:string,fields:Array}}
 */
export function buildDynamicSchemaFromSections(parsed, templateId, title, options = {}) {
  const { strictTemplateFields = true } = options;
  const fields = [];

  parsed.sections
    .sort((a, b) => {
      if (typeof a.index === 'number' && typeof b.index === 'number') return a.index - b.index;
      if (typeof a.index === 'number') return -1;
      if (typeof b.index === 'number') return 1;
      return 0;
    })
    .forEach((sec) => {
      // In strict mode, do not synthesize special objects unless placeholders make them explicit.
      if (!strictTemplateFields && /project duration/i.test(sec.title)) {
        fields.push({
          key: 'project_duration',
          label: 'Project Duration',
          type: 'object',
          properties: [
            { key: 'start_date', label: 'Start Date', type: 'date' },
            { key: 'end_date', label: 'End Date', type: 'date' },
          ],
        });
        return;
      }

      if ((sec.fields || []).length > 1) {
        fields.push({
          key: normalizeKey(sec.title),
          label: sec.title,
          type: 'object',
          properties: sec.fields.map(({ key, label, type }) => ({ key, label, type })),
        });
      } else {
        const only = sec.fields[0];
        if (only) fields.push({ key: only.key, label: only.label, type: only.type });
      }
    });

  // Do NOT add Authorization or any extra blocks in strict mode.
  if (!strictTemplateFields) {
    if (!fields.some((f) => f.key === 'authorization_signatures')) {
      fields.push({
        key: 'authorization_signatures',
        label: 'Authorization',
        type: 'object',
        properties: [
          { key: 'supplier_signature_name', label: 'Supplier — Name', type: 'text' },
          { key: 'supplier_signature_date', label: 'Supplier — Date', type: 'date' },
          { key: 'client_signature_name', label: 'Client — Name', type: 'text' },
          { key: 'client_signature_date', label: 'Client — Date', type: 'date' },
        ],
      });
    }
  }

  return { id: templateId, title: title || templateId, fields };
}

// Helpers

function extractPlaceholdersFromLine(line, { strictTemplateFields = true } = {}) {
  const out = [];
  // [Placeholders]
  const brackets = Array.from(line.matchAll(/\[([^\]\n]+)\]/g)).map((m) => m[1].trim());
  // <AnglePlaceholders>
  const angles = Array.from(line.matchAll(/<([^>\n]+)>/g)).map((m) => m[1].trim());

  [...brackets, ...angles].forEach((label) => {
    out.push({
      key: normalizeKey(label),
      label,
      type: inferType(label, line),
      source: 'auto',
    });
  });

  if (!strictTemplateFields) {
    // Legacy: Implicit date hints like "Start Date:" or "End Date:" with no []/<> tokens
    if (/start date\s*:?(\s*)$/i.test(line) && !out.some((f) => /start_date/.test(f.key))) {
      out.push({ key: 'start_date', label: 'Start Date', type: 'date', source: 'inferred' });
    }
    if (/end date\s*:?(\s*)$/i.test(line) && !out.some((f) => /end_date/.test(f.key))) {
      out.push({ key: 'end_date', label: 'End Date', type: 'date', source: 'inferred' });
    }
  }

  return out;
}

function inferType(label, contextLine = '') {
  const l = (label || '').toLowerCase();
  const c = (contextLine || '').toLowerCase();
  if (l.includes('date') || /date:/.test(c)) return 'date';
  if (l.includes('email')) return 'email';
  if (l.includes('rate') || l.includes('budget') || l.includes('cost') || l.includes('payment')) return 'currency';
  if (l.includes('description') || l.includes('scope') || /charges|payment|change control/.test(c)) return 'textarea';
  return 'text';
}

function ensureField(arr, f) {
  if (!arr.find((x) => x.key === f.key)) arr.push(f);
}

function enhanceKnownSections(sections) {
  // Legacy non-strict augmentation helper; only used when strictTemplateFields = false.
  sections.forEach((sec) => {
    const t = sec.title.toLowerCase();
    if (/supplier deliverables|client deliverables|project schedule|milestones|communication paths|key client personnel/.test(t)) {
      ensureField(sec.fields, { key: normalizeKey(sec.title), label: sec.title, type: 'list', source: 'inferred' });
    }
    if (/address for communications/.test(t)) {
      ensureField(sec.fields, { key: 'supplier_name', label: 'Supplier Name', type: 'text', source: 'inferred' });
      ensureField(sec.fields, { key: 'contact_name', label: 'Contact Name', type: 'text', source: 'inferred' });
      ensureField(sec.fields, { key: 'email', label: 'Email', type: 'email', source: 'inferred' });
      ensureField(sec.fields, { key: 'address', label: 'Address', type: 'textarea', source: 'inferred' });
    }
    if (/charges & payment/.test(t)) {
      ensureField(sec.fields, { key: normalizeKey(sec.title), label: sec.title, type: 'textarea', source: 'inferred' });
    }
    if (/type of project/.test(t) && !sec.fields.some((f) => f.key === 'type_of_project')) {
      ensureField(sec.fields, { key: 'type_of_project', label: 'Type of Project', type: 'text', source: 'inferred' });
    }
  });
}

function normalizeEols(s) {
  return s.replace(/\r\n/g, '\n').replace(/\\r/g, '\n');
}

function normalizeKey(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
