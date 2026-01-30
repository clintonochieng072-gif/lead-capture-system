# Lead Capture MVP

Minimal Next.js + Supabase MVP for lead-capture links.

Quick start:

1. Copy `.env.local.example` to `.env.local` and fill your Supabase values.
2. Install dependencies:

```bash
npm install
```

3. Run dev:

```bash
npm run dev
```

Notes:
- Do NOT commit `SUPABASE_SERVICE_ROLE_KEY`.
- SQL migrations are in `supabase/sql/create_tables.sql` — run them in Supabase SQL editor.
