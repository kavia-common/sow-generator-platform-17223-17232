# SOW Templates: Bundled and User Uploads

This app supports two ways to provide Word (.docx) templates used for Statement of Work generation:
- Bundled default templates (shipped with the app)
- User-uploaded templates (persisted locally in the browser)

## Bundled Templates

- Public templates directory: `public/templates`
- The app expects the following files to be bundled:
  - `/templates/sow_tm_supplier.docx` for Time & Material (T&M)
  - `/templates/sow_fixed_price_supplier.docx` for Fixed Price (FP)

If these DOCX files are not present at runtime, the generator will:
- Use the corresponding `.txt` transcript from `public/attachments/*` to merge user data into placeholders.
- Render a minimal DOCX that preserves the transcript text and any inserted values.
- Present a one-time alert notifying the user that a fallback was used.

Recommended:
- Replace the fallback by placing the original Word .docx templates in `public/templates` with the filenames listed above.
- Adjust `src/services/bundledTemplates.js` if your filenames are different.

Field mapping:
- Form fields and tag mapping are driven by the parsed transcript structures that ship with the repository (see `src/templates/parsed/*.json`) and by strict placeholder extraction from the `.txt` transcripts for generation when falling back.
- Unfilled placeholders remain as-is in the document (kept visible in the output) when using docxtemplater merging.

## User-Uploaded Templates (New)

You can upload your own .docx templates and assign them to either FP or T&M. Once uploaded, your template overrides the bundled/default template for that type for future exports.

Where to upload:
- Use the “Upload DOCX” control in the top Glass header.
- Choose the target type (FP or TM) from the selector, then pick your `.docx` file.

What happens after upload:
- The app validates that the file looks like a `.docx` (zip) and stores it locally in your browser.
- The header indicators show which SOW type is currently using your uploaded template.
- When you generate a DOCX for that type, your uploaded template is used first.

Persistence:
- By default (no backend), uploads are persisted in `localStorage` as base64 for portability.
- Clearing browser storage or using a different browser/profile will remove access to uploaded templates.

Implementation details:
- Storage logic: `src/services/templateStorage.js`
  - saveTemplateForType(type, fileOrBlob)
  - hasUserTemplate(type)
  - getActiveTemplateInfo(type)
  - getUserTemplateBlob(type)
- Upload UI: `src/components/TemplateUploadControl.jsx` (integrated into `GlassHeader`)
- Generation logic: `src/pages/DocxPreviewAndGenerate.jsx` prioritizes user-uploaded template; if absent, tries bundled; if missing, falls back to transcript-based minimal DOCX.

## Backend Integration (Optional)

If a backend file store (e.g., Supabase Storage) is available, you can:
- Replace the local storage calls in `templateStorage.js` with API calls to upload/download per-user templates.
- Ensure you configure the environment:
  - REACT_APP_SUPABASE_URL
  - REACT_APP_SUPABASE_KEY
  - (Optionally) REACT_APP_SITE_URL for auth redirects.

Until backend integration is wired, the local storage mechanism ensures users can still upload and use their templates.

## Troubleshooting

- “Invalid DOCX file” error on upload/generation:
  - Ensure you’re uploading the actual `.docx` (binary) file exported from Word/Google Docs—not a `.txt` transcript.
- Indicators show “Bundled” instead of “Your Template”:
  - Upload a template for that type (FP or T&M) via the header control.
- Fallback alert during generation:
  - Bundled `.docx` not found; transcript-based minimal DOCX was generated. Provide the original `.docx` via upload or place expected files in `public/templates`.
