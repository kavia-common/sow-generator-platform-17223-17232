# SOW Generator Frontend (Ocean Professional)

Elegant React UI for creating Statements of Work:
- Landing/Login intro following the elegant neon gradient theme
- Full SOW data collection form (all required fields; excludes any “Answer” column)
- Logo upload and inline display
- FP / T&M template selection
- AI prompt panel as in-page right slide-over with right-side launcher icon
- Review & edit
- Export as Word (.docx) with two paths:
  1) Exact Template (Pixel-perfect, Recommended): Uses the actual user-provided .docx as the base. Only placeholder tags in the .docx are replaced; all layout/styles/sections remain identical. Unfilled tags remain as-is. Requires providing data.meta.templateDocxUrl pointing to the uploaded .docx (e.g., a Supabase storage URL).
  2) Preview Overlay (Approximation): On-screen visual preview that overlays values; not pixel-identical and not used for exact export.

IMPORTANT: OpenAI is not supported in this deployment. The AI features use only the local backend_express endpoints.

## Run

1) Copy .env.example to .env and set values:
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_SITE_URL (redirect for email link sign-in if used)
- (optional) REACT_APP_BACKEND_URL to point to backend_express, e.g. http://localhost:8080

2) Install and start:
- npm install
- npm start

## AI Backend (Local Only)

- The frontend calls POST /api/ai/sow on the local backend_express. You can configure either:
  - CRA dev proxy: In development, set "proxy": "http://localhost:8080" in frontend_reactjs/package.json (see below), or
  - Absolute base URL: Set REACT_APP_BACKEND_URL=http://localhost:8080 in .env

- Endpoint used by the app:
  - POST /api/ai/sow
    Body: { "prompt": "..." }
    Returns: { ok: true, sow: "..." }

No OpenAI keys are required or supported.

## Dev Proxy Guidance (optional, recommended for local dev)

In frontend_reactjs/package.json, add:
  "proxy": "http://localhost:8080"

This allows the app to call /api/* directly during development. Remember to remove/adjust this for production as needed.

## Exact DOCX Export (Pixel-perfect)

This app supports a pixel-perfect export that uses the exact user-provided .docx as the base file and fills only placeholders in-place using docxtemplater + PizZip.

Requirements:
- Provide the template .docx URL in the UI state at `data.meta.templateDocxUrl`. This should be a direct URL accessible from the browser (e.g., a public Supabase storage URL).
- Only tags/placeholders that exist in the .docx will be replaced. All other content will remain unchanged.
- Unfilled placeholders remain untouched (kept as the original tag text). No extra sections, overlays, reorders, or style changes are introduced.

Steps:
1) When a user selects or uploads a template, store the accessible .docx URL as `data.meta.templateDocxUrl`.
2) The “Generate DOCX (Exact Template)” button in Preview & Generate will load that .docx, merge the values from `data.templateData`, and produce a .docx visually identical to the template except for filled values.

Notes:
- If `data.meta.templateDocxUrl` is not provided, the exact export cannot proceed and the UI will prompt the user to supply the .docx URL.
- The Preview Overlay option remains available for on-screen approximation but is not intended for exact pixel fidelity.

## Notes

- Word export preview is available via overlay mode; for production-quality output, use the Exact Template option.
