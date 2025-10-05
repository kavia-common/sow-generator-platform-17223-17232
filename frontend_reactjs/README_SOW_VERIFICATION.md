Summary of SOW Form refactor (two-column strict layout)

Modified files:
- src/pages/SOWForm.jsx
  - Implemented config-driven rendering: fieldConfig derived from template sections.
  - Enforced strict two-column layout (left labels, right inputs) using .sow-table structure.
  - Fixed Description alignment with min-height and top-aligned labels.
  - Removed any duplicate label rendering by qualifying object properties (e.g., "Scope — Description").
  - Ensured each field renders exactly once.
  - Maintained logo upload in a labeled row.
  - Preserved Generate DOCX action.

- src/styles.css
  - Added .sow-table, .sow-row, .sow-cell, .sow-label, .sow-input, .sow-section styles per assets/sow_form_design_notes.md.
  - Applied elegant theme accents (primary #F472B6, secondary #F59E0B) in headers.
  - Ensured responsive behavior to stack on small screens while keeping spacing consistent.

Notes:
- Labels are linked to inputs with htmlFor/id.
- When template fields include nested objects, labels are qualified to avoid duplicates (e.g., “Deliverable 1 — Description”).
- Description textarea min-height is set to 96px to match design guidance.
