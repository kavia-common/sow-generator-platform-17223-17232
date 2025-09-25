# SOW Generator Frontend (Ocean Professional)

Elegant React UI for creating Statements of Work:
- Landing/Login intro following the elegant neon gradient theme
- Full SOW data collection form (all required fields; excludes any “Answer” column)
- Logo upload and inline display
- FP / T&M template selection
- AI prompt panel as in-page right slide-over with right-side launcher icon
- Review & edit
- Export as Word (.docx) following the SOW template (headings, paragraphs, bullet lists)

## Run

1) Copy .env.example to .env and set values (optional for Supabase/AI backends):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_SITE_URL (redirect for email link sign-in if used)
- REACT_APP_OPENAI_API_KEY (optional for AI fallback)

2) Install and start:
- npm install
- npm start

## Notes

- The AI generation step can use a local backend /api/ai/sow or OpenAI fallback if configured.
- Word export is generated client-side without extra libraries and follows the extracted template structure.
