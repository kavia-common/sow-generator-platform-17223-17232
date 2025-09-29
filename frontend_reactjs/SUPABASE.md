# Supabase Integration (Frontend)

This app uses Supabase for storing SOW drafts and templates.

Environment variables (see .env.example):
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- REACT_APP_SITE_URL (optional, used for emailRedirectTo for magic link flows)

Client initialization:
- src/supabaseClient.js uses createClient(SUPABASE_URL, SUPABASE_KEY)

Suggested tables:
1) sows
- id: bigint (pk, generated)
- title: text
- template: text
- content: text
- created_at: timestamptz default now()

2) templates
- id: uuid (pk, default uuid_generate_v4()) or bigint
- name: text
- type: text (e.g., FP or TM)
- body: text
- updated_at: timestamptz default now()

Security
- For anonymous demos, enable RLS as needed and allow inserts/selects for anon role to sows/templates (or protect via auth).
- In production, configure policies to restrict access by auth.user().

Usage in code:
- Export step can "Save to Supabase" (src/pages/ExportPDF.jsx) via supabase.from("sows").insert(...)
- Template management UI uses supabase.from("templates") for create/list/update/delete (added in this commit).

Notes:
- If you change table names/columns, update respective calls in src/pages/TemplatesManager.jsx accordingly.
