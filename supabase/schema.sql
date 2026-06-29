create extension if not exists pgcrypto;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  workflow text not null check (workflow in ('CV Match', 'CRM Analysis', 'Prospect Qualification')),
  input_summary text not null,
  result_summary text not null,
  quality text not null default 'Quality check passed',
  review_status text not null default 'Ready to review',
  evidence jsonb not null default '[]'::jsonb,
  data_used jsonb not null default '[]'::jsonb,
  provider text not null default 'OpenRouter Auto',
  harness_path text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  title text,
  source_file text,
  target_role text,
  score int check (score between 0 and 100),
  confidence_label text,
  summary text,
  evidence jsonb not null default '[]'::jsonb,
  gaps jsonb not null default '[]'::jsonb,
  review_status text not null default 'Ready to review'
);

create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company text not null,
  owner text,
  stage text,
  value numeric,
  last_activity_at date,
  probability int check (probability between 0 and 100),
  risk text not null default 'Medium',
  recommended_action text,
  source_file text
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  title text,
  company text not null,
  email text,
  source text,
  fit int check (fit between 0 and 100),
  status text not null default 'Review',
  reason text,
  next_action text,
  crm_capture_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid references public.runs(id) on delete cascade,
  action text not null,
  approved_by text,
  approved_at timestamptz,
  notes text
);

alter table public.runs enable row level security;
alter table public.candidates enable row level security;
alter table public.crm_deals enable row level security;
alter table public.prospects enable row level security;
alter table public.approvals enable row level security;

create policy "Authenticated users can manage runs"
  on public.runs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage candidates"
  on public.candidates for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage crm deals"
  on public.crm_deals for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage prospects"
  on public.prospects for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage approvals"
  on public.approvals for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
