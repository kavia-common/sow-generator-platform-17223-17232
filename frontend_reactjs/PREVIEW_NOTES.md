# Preview Notes — frontend_reactjs

Status
- React dev server started successfully via `npm start`.
- Initial failure was due to missing `react-scripts`; installed `react-scripts@5.0.1` and restarted.

Access
- Local URL: http://localhost:3000

Environment configuration (optional but recommended)
- Supabase:
  - REACT_APP_SUPABASE_URL
  - REACT_APP_SUPABASE_KEY
  - REACT_APP_SITE_URL (email redirect target)
- AI fallback:
  - REACT_APP_OPENAI_API_KEY
  - REACT_APP_OPENAI_MODEL (optional)

Observed warnings (non-blocking)
- ESLint a11y: redundant role on <section> (src/components/Hero.jsx).
- Minor "unused var" in PDF helpers (src/pages/ExportPDF.jsx, src/pages/Login.jsx).
- Unnecessary escape character warning in a regex/string (src/pages/ExportPDF.jsx).
- Browserslist data out of date (non-critical).

Next steps (optional)
- Provide .env with required values for Supabase/AI to enable full functionality.
- Resolve ESLint warnings for cleaner builds if desired.
- If a backend is available, configure a dev proxy or ensure /api/ai/sow is reachable.
