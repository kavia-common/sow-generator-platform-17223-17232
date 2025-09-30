# Bundled SOW Templates

- Public templates directory: `public/templates`
- The app expects the following files to be bundled:
  - `/templates/sow_tm_supplier.docx` for T&M
  - `/templates/sow_fixed_price_supplier.docx` for Fixed Price

If these DOCX files are not present at runtime, the generator will:
- Use the corresponding .txt transcript from `public/attachments/*` to merge user data into placeholders.
- Render a minimal DOCX that preserves the transcript text and any inserted values.
- Present a one-time alert notifying the user that a fallback was used.

Recommended:
- Replace the fallback by placing the original Word .docx templates in `public/templates` with the filenames listed above.
- Adjust `src/services/bundledTemplates.js` if your filenames are different.

Field mapping:
- Form fields and tag mapping are driven by the parsed transcript structures that ship with the repository (see `src/templates/parsed/*.json`) and by strict placeholder extraction from the .txt transcripts for generation.
- Unfilled placeholders remain as-is in the Document (kept visible in the output).
