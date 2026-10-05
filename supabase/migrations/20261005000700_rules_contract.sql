-- Motor de reglas y contrato de temporada.

create type public.evidence_level as enum ('strong', 'moderate', 'debated', 'expert_opinion');

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code text not null,                   -- id legible, p. ej. 'acwr_high'
  version integer not null default 1,
  condition jsonb not null,
  action text not null,
  source text not null,
  evidence public.evidence_level not null,
  blocking boolean not null default false,
  configurable boolean not null default true,
  params jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, code, version)
);
select app.enable_owner_rls('public.rules');

create table public.rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rule_id uuid not null references public.rules (id) on delete cascade,
  evaluated_on date not null,
  triggered boolean not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.rule_evaluations');

create table public.season_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  objective text not null,
  why text not null,
  sacrifices text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.season_contracts');

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contract_id uuid references public.season_contracts (id) on delete set null,
  week_start date not null,
  rpe smallint check (rpe between 1 and 10),
  feelings text,
  one_improvement text,
  key_sessions_planned smallint,
  key_sessions_done smallint,
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);
select app.enable_owner_rls('public.weekly_reviews');
