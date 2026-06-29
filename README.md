# Talent Ops Studio

Talent Ops Studio is a portfolio product for AI-assisted recruiting, CRM analysis, and prospect qualification. It is designed to match a job offer asking for AI automation, generative AI APIs, CRM data work, prospecting, and recruiting process optimization.

## What It Demonstrates

- CV match and dispatch with evidence-backed recommendations.
- CRM CSV analysis for stalled deals, missing follow-ups, and business development actions.
- Prospect qualification from an ICP, source list, and manual company/profile input.
- Activity logs persisted in Supabase with data used, quality checks, model provider, and human review status.
- An ICM-style harness folder that makes the agent workflow inspectable.
- A model-agnostic gateway that can target OpenRouter, Groq, OpenCode-compatible endpoints, or any OpenAI-compatible provider.

## Run Locally

```bash
npm install
npm run dev
```

The app requires Supabase and a server-side model gateway for real workflow runs. Without those values, the UI loads but analysis actions are blocked with a configuration message.

## Environment

```bash
cp .env.example .env
```

Useful variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `MODEL_BASE_URL`
- `MODEL_API_KEY`
- `MODEL_NAME`
- `MODEL_PROVIDER_LABEL`

## Supabase

Apply the database migration in `supabase/migrations/`, then deploy functions from `supabase/functions/`. If you prefer the dashboard, you can also paste `supabase/schema.sql` into the Supabase SQL Editor and run it once.

Tables:

- `runs`
- `candidates`
- `crm_deals`
- `prospects`
- `approvals`

Functions:

- `analyze-cv`
- `analyze-crm`
- `qualify-prospects`
- `capture-prospects`
- `list-workspace`

Set secrets for the Edge Functions:

```bash
supabase secrets set \
  SUPABASE_URL="https://PROJECT_REF.supabase.co" \
  SUPABASE_SECRET_KEY="sb_secret_..." \
  MODEL_BASE_URL="https://api.groq.com/openai/v1" \
  MODEL_API_KEY="..." \
  MODEL_NAME="llama-3.3-70b-versatile" \
  MODEL_PROVIDER_LABEL="Groq"
```

Then deploy:

```bash
supabase db push
supabase functions deploy analyze-cv
supabase functions deploy analyze-crm
supabase functions deploy qualify-prospects
supabase functions deploy capture-prospects
supabase functions deploy list-workspace
```

## Frontend Deployment

Any static host that supports Vite works. For Vercel:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel deploy --prod
```

Only expose `VITE_*` variables to the frontend. Keep `MODEL_API_KEY` and `SUPABASE_SECRET_KEY` inside Supabase Edge Function secrets.

## Harness

The harness lives in `harness/icm/`.

```txt
harness/icm/
├── CLAUDE.md
├── CONTEXT.md
├── label-registry.json
├── shared/references/
└── workspaces/
```

Each workflow has its own workspace, router, references, and numbered stage contracts.

## Design References

The interface was shaped from Superdesign drafts:

- Command Center: https://p.superdesign.dev/draft/c1e17cfe-e13f-488f-9682-39bf9b721bc0
- CV Match & Dispatch: https://p.superdesign.dev/draft/dba291f2-8af0-43cf-807c-90f60eb9d8f5
- CRM Pipeline Optimizer: https://p.superdesign.dev/draft/e6c6f595-82ab-4bb8-8f76-e73fac767eb6
- Prospect Qualification: https://p.superdesign.dev/draft/ef261dd4-a0f9-404f-b2db-8f7957134274
- Activity Logs: https://p.superdesign.dev/draft/6f9fdb7a-4d19-4429-be3f-7e8a1590433a

## Interview Demo Path

1. Open Command Center and show the three workflows.
2. Run CV Match and explain the input, stage map, evidence, and dispatch recommendation.
3. Run CRM Analysis and show how stale opportunities become next-best actions.
4. Run Prospect Qualification and show ICP scoring plus CRM capture review.
5. Open Activity Logs and show the trace record, provider, data used, and quality check.
