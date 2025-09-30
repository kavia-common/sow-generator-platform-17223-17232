# SOW Template Merge, Review, and Export Verification Guide

This guide outlines the exact steps to verify that:
1) User-entered SOW form data merges ONLY into the selected template.
2) The Review screen reflects the selected template and user inputs.
3) The exported Word document corresponds to the selected template with accurate data.

Pre-requisites:
- App running at http://localhost:3000 (or the workspace URL shown in your environment).
- Environment variables configured: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in the .env file at the project root for the frontend container if authentication/data flows are used.

Test Data (Sentinel Inputs):
Use distinctive values to easily spot them in the review and in the exported document. For example:
- Company Name: Zeta Orion Test Co.
- Project Name: Nebula Integration - QA Run A
- Project Description: End-to-end verification for template selection and merge.
- Start Date: 2025-02-03
- End Date: 2025-05-15
- Location: Remote / EU
- Billing Model: Time & Materials (for TM template) or Fixed Price (for FP template)
- SOW Manager: Alex QA
- Scope Highlights: "Implement API gateway with throttling; Migrate auth to Supabase."

Verification Steps:

1) Select Template
   - Navigate to Template Select page.
   - Choose a specific template, e.g. "T&M Supplier SOW" or "Fixed Price Supplier SOW".
   - Confirm the UI indicates your chosen template is "selected".
   - Proceed to the SOW Form.

2) Fill SOW Form
   - Enter all sentinel values from above.
   - Ensure fields like Project Name, Dates, and Scope Highlights are clearly filled to appear in multiple sections.
   - Save/Continue.

3) Review Screen Validation
   - Confirm the Review Screen shows headings/sections that match ONLY the selected template (e.g., TM vs Fixed Price have different sections/labels).
   - Verify all sentinel values appear in the review content:
     - Company Name
     - Project Name and Description
     - Start/End Dates
     - Location
     - SOW Manager
     - Scope Highlights
   - Confirm there is no bleed-over from a different template (e.g., Fixed Price sections should NOT appear when TM is selected).

4) Export to Word
   - Click Export or Generate Word.
   - After generation completes, open the .docx.
   - Confirm:
     - The structure, section headings, and boilerplate match the selected template.
     - All sentinel inputs are present where expected.
     - There are no sections from unselected templates.

5) Cross-Template Negative Check
   - Repeat the above for BOTH templates (e.g., T&M and Fixed Price).
   - Ensure that T&M selections never produce Fixed Price content and vice versa.

Troubleshooting Hints (Code Pointers):
- Template Selection
  - src/pages/TemplateSelect.jsx: ensure selection state is persisted (via React Router state, context, or local state) and passed forward.
- Form Data
  - src/pages/SOWForm.jsx: verify the form is keyed to the selected template schema and stores data accordingly.
- Review Rendering
  - src/pages/ReviewScreen.jsx: confirm it uses the selected template identifier to load the correct parsed schema and renders only that layout.
  - src/templates/parsed/*.json and src/templates/sowTemplateSchemas.json: mappings for template-specific sections and merge points.
- Export Generation
  - src/pages/DocxPreviewAndGenerate.jsx and src/pages/ExportWord.jsx: ensure the export receives the selected template key and the current form data.
  - src/services/docxTemplateService.js and src/services/sowTemplateParser.js: verify that the merge functions use the chosen template ID and do not default to the first or a hard-coded template.

Expected Result:
- Review page and exported .docx match the selected template’s structure and include all user-entered sentinel data with no leakage from other templates.

Notes:
- If Supabase is in use and auth gating is enabled, log in first and ensure your environment variables are properly set.
- If any mismatch is observed, inspect the selected template value’s propagation across pages and the service functions to confirm the correct template key is consistently used during merge and export.
