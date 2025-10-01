# SOW Export Verification Steps (QA Notes)

Purpose: Validate that the SOW export to Word includes all fields, the logo at the top-left, and a signature at the bottom.

Pre-requisites:
- Frontend app running at http://localhost:3000 (or the provided preview URL).
- Environment variables configured: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY (only required for flows touching Supabase).
- Two images to upload during the test:
  - Logo: a rectangular PNG/JPG approx 400x120 recommended
  - Signature: a cropped transparent PNG of a signature approx 400x140

Test Data:
- SOW Type: TM
- Client Name: Acme Corp
- Project: Test Automation
- Start Date: 2024-07-10
- End Date: 2024-09-30
- Fill all other fields with short realistic text.

Steps:
1. Open the app and navigate to Template Select. Choose the TM template.
2. Proceed to the SOW form. Fill the fields:
   - SOW Type = TM
   - Client Name = Acme Corp
   - Project = Test Automation
   - Start Date = 2024-07-10
   - End Date = 2024-09-30
   - Fill remaining sections (scope, deliverables, assumptions, pricing, billing, acceptance, change control, risks, contacts, etc.) with short realistic text.
3. Upload images:
   - Logo: select a sample image file from your local filesystem.
   - Signature: select a sample signature image file from your local filesystem.
4. Submit/Review: Proceed to Review/Export screen.
5. Export to Word: Click Export/Generate DOCX and download the generated file.
6. Visual validation (in the DOCX):
   - Confirm all entered fields appear (no omissions).
   - Confirm logo is placed in the top-left area of the first page header or title section.
   - Confirm signature image is at the bottom or in the signature block of the last page and is visible at a reasonable size.
   - Confirm dates, project, client name render correctly and formatting is consistent.

Expected Results:
- The DOCX contains all filled data mapped into the template.
- The logo appears in the top-left, not stretched or oversized.
- The signature appears at the bottom section with proper spacing.

Issues to note if found:
- Missing fields or unmapped placeholders.
- Misplaced logo (not top-left) or incorrect scaling.
- Signature missing, misplaced, or distorted.
- Any rendering errors, clipped text, or pagination problems.

Troubleshooting:
- If images do not appear, ensure file types are supported (PNG/JPG) and size under typical limits (e.g., < 5 MB).
- If export fails, check browser console and the frontend logs for errors in docx builder services:
  - src/services/sowDocxBuilder.js
  - src/services/docxTemplateService.js
  - src/services/strictDocxTemplateMergeService.js
- If Supabase is required for specific flows, confirm environment variables are set and the app restarted.

Notes:
- This document is for QA guidance only. No code changes are needed for test execution.
