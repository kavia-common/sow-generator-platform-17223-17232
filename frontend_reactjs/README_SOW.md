# SOW Generator Frontend (Ocean Professional)

Elegant React UI for creating Statements of Work following the BRS:
- Company & Project details via guided forms
- FP / T&M template selection
- AI draft generation (simulated in MVP)
- Review & edit
- Export (download text) and Save to Supabase

## Run

1) Copy .env.example to .env and set values:
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_SITE_URL (redirect for email link sign-in if used)

2) Install and start:
- npm install
- npm start

## Supabase Schema (suggested)

Create a table:
- sows: id (pk), title (text), template (text), content (text), created_at (timestamptz default now())

## Notes

- The AI generation step is simulated; integrate your OpenAPI backend and LLM as needed.
- PDF export can be implemented with pdf-lib in future iteration.
