# SOW Generator Frontend (Ocean Professional)

Elegant React UI for creating Statements of Work:
- Landing/Login intro following the elegant neon gradient theme
- Full SOW data collection form (all required fields; excludes any “Answer” column)
- Logo upload and inline display
- FP / T&M template selection
- AI prompt panel as in-page right slide-over with right-side launcher icon
- Review & edit
- Export as Word (.docx) following the SOW template (headings, paragraphs, bullet lists)

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

## Notes

- Word export is generated client-side without extra libraries and follows the extracted template structure.
