# Contributing & Setup (Supakey)

This guide covers local development and production setup for Supakey (auth, edge functions, and admin UI).

## Prerequisites

- Node.js 18+
- Supabase CLI (logged in with a Supabase access token)
- A Supabase project for Supakey itself

## Environment

1. Frontend (Vite): copy example and fill values

```
cp supakey/.env.example supakey/.env
```

- `VITE_SUPABASE_URL` — Supakey Supabase URL
- `VITE_SUPABASE_ANON_KEY` — Supakey anon key
- `ALLOWED_ORIGINS` — comma-separated origins for functions;

1. Server-side env (Supabase project → Functions → Variables)

- Runtime provides: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Deploy Functions

```
# From supakey directory
supabase functions deploy oauth-token oauth-authorize issue-app-tokens deploy-migrations connection-status --project-ref <PROJECT_REF>
```

## Security Setup (Production)

- Disable signups in Supabase Auth (Email → uncheck “Allow new users to sign up”).
- Set `ALLOWED_ORIGINS` to your exact domains (no localhost).
- Confirm RLS: policies scope by `auth.uid()` for all `supakey.*` tables.
- Restrict PostgREST `db_schema` to required schemas only.
- Do not commit real secrets; keep only `.env.example` in git.

## Run Frontend Locally

```
cd supakey
npm install
npm run dev
```

## Contributing

- Open issues/PRs; small, focused changes preferred.
- Avoid exposing secrets in logs or client code.
- Keep function interfaces minimal (no secrets returned from functions).

## Security

- Please report suspected vulnerabilities privately to `hello@supakey.app`. Avoid filing public issues; we’ll acknowledge and work with you on a fix/coordination.
