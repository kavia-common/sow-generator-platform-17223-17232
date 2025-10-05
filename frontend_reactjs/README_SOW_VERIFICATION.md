Summary of SOW Form updates: strict layout + robust image upload

What changed
- src/pages/SOWForm.jsx
  - Centralized handleFile(e, 'logo'|'signatureKey') with image type validation and safe previews (URL.createObjectURL). Old object URLs are revoked on change/unmount to avoid leaks.
  - File inputs use accept="image/*" and do not auto-upload; only preview on selection.
  - Drag-and-drop supported on the logo and signature fields; default navigation is prevented so the page is not hijacked.
  - Accessibility: aria-invalid and aria-describedby link inputs to inline error text when validation or upload fails.
  - Optional Supabase Storage: on Save/Generate, if REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY exist, files are uploaded to bucket "assets" with unique keys; public URLs are stored back into form data. Upload errors are shown inline and do not block other actions.
  - Theme preserved (two-column grid with left labels, right inputs). No global color/variable changes.

- src/styles.css
  - Scoped helpers under .sow-form to constrain previews (max-height: 80px) and keep spacing. No global style changes.

Quick verification steps
1) Basic preview (no Supabase):
   - Ensure your .env does NOT include REACT_APP_SUPABASE_URL/KEY.
   - Run the app. In SOW Form > Branding, click "Choose Logo", select an image (png/jpg/webp).
   - Expected: file name appears; preview image shows (max-height ~80px); no upload occurs.
   - For any signature field (type "signature"), click "Choose Signature" and pick an image.
   - Expected: per-field preview appears; name shows.

2) Drag-and-drop:
   - Drag an image file onto the Branding row (right input cell), or onto a signature field area.
   - Expected: The page does NOT navigate away; the preview updates with the dropped file.

3) Invalid file handling:
   - Try selecting a non-image file (e.g., .pdf or .txt).
   - Expected: Inline error "Please select a valid image file." appears below the field; other fields unaffected.

4) Accessibility:
   - Inspect inputs and error elements: aria-invalid is true when there's an error.
   - aria-describedby points to the error element id (role="alert").

5) Supabase upload (optional):
   - Add to .env:
     REACT_APP_SUPABASE_URL=<your supabase url>
     REACT_APP_SUPABASE_KEY=<your anon key>
   - Restart the app (env changes require rebuild in CRA).
   - Select logo and signature images.
   - Click "Save" or "Generate DOCX".
   - Expected: Files upload to bucket "assets" with unique keys like <userId||anon>/<timestamp>_<name>.
     On success, the form replaces local blob previews with public URLs. On failure, an inline error is shown but the action proceeds.

6) Responsiveness:
   - Resize window below ~980px.
   - Expected: SOW table stacks to single column; previews remain constrained; layout remains consistent.

Notes
- No SOW fields were added/renamed; labels remain exactly as defined by the template.
- Previews are safe and object URLs are revoked to avoid leaks.
- Generation does not require Supabase; uploads occur only when env vars are present.

