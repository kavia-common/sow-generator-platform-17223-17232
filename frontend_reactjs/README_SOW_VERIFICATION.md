# SOW Template Merge, Review, and Export Verification Guide

This guide outlines the exact steps to verify that:
1) User-entered SOW form data merges ONLY into the selected template.
2) The Review screen reflects the selected template and user inputs.
3) The exported Word document corresponds to the selected template with accurate data, using a valid DOCX package.
4) The input fields do not flicker during typing.

Pre-requisites:
- App running at http://localhost:3000 (or the workspace URL shown in your environment).
- Environment variables configured: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in the .env file at the project root for the frontend container if authentication/data flows are used.

DOCX Export Dependencies (must be installed):
- Install required packages in the frontend project:
  npm install docxtemplater pizzip --workspace ./frontend_reactjs

Template files (for exact template export; optional but recommended):
- Place the exact template files to avoid fallback mode:
  - frontend_reactjs/public/templates/T&M_Supplier_SoW_Template.docx
  - frontend_reactjs/public/templates/Fixed price_Supplier_SoW_Template.docx

Optional default assets:
- frontend_reactjs/public/assets/default_logo.png
- frontend_reactjs/public/assets/default_signature.png
If absent, the exporter proceeds without fallback images.

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

2) Fill SOW Form (Verify no flicker)
   - Enter all sentinel values from above.
   - Ensure fields like Project Name, Dates, and Scope Highlights are clearly filled to appear in multiple sections.
   - Typing should be smooth and stable (no flicker). If you see flicker, ensure you have the updated SOWForm.jsx with debounced parent onChange and stabilized handlers.
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
   - Click Generate DOCX in the Preview & Generate step.
   - If exact templates are present under public/templates, a valid .docx will be generated via in-place merge.
   - If exact templates are not present, the system gracefully falls back to a transcript-rendered DOCX and shows a notice.
   - Open the .docx and confirm:
     - The structure, section headings, and boilerplate match the selected template (or the transcript fallback notice if applicable).
     - All sentinel inputs are present where expected.
     - There are no sections from unselected templates.
     - No "not a valid DOCX (zip) package" error occurs.

5) Cross-Template Negative Check
   - Repeat the above for BOTH templates (e.g., T&M and Fixed Price).
   - Ensure that T&M selections never produce Fixed Price content and vice versa.

Troubleshooting Hints (Code Pointers):
- Template Selection
  - src/pages/TemplateSelect.jsx: ensure selection state is persisted (via React Router state, context, or local state) and passed forward.
- Form Data
  - src/pages/SOWForm.jsx: verify the form is keyed to the selected template schema and stores data accordingly; no input flicker should occur with the updated debounced onChange and memoized handlers.
- Export Generation
  - src/pages/DocxPreviewAndGenerate.jsx: uses docxInPlaceTemplateMergeService; alerts if dependencies are missing or if a template file is invalid.
  - src/services/docxInPlaceTemplateMergeService.js: robust DOCX validation and comprehensive data mapping (deep flattening to include all fields).
  - src/services/bundledTemplates.js: registry for bundled template URLs and transcript fallbacks.
- Removed Legacy Logic
  - src/services/exactTemplateExportService.js was removed to prevent invalid DOCX packages.
  - The app no longer relies on obsolete minimal-zip builders for export.

Expected Result:
- Review page and exported .docx match the selected template’s structure and include all user-entered sentinel data with no leakage from other templates.
- Exported file opens in Word without errors.

If you encounter a "Module not found: docxtemplater/pizzip" error:
- Run: npm install docxtemplater pizzip --workspace ./frontend_reactjs
- Rebuild/restart the app and retry the export.
