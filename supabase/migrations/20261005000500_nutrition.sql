-- Nutrición periodizada.

create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  day_band text not null,               -- rest | easy | moderate | long | carbLoad
  carbs_g_min integer not null,
  carbs_g_max integer not null,
  protein_g_min integer not null,
  protein_g_max integer not null,
  intra_carbs_g_per_h_min integer,
  intra_carbs_g_per_h_max integer,
  reasons text[] not null default '{}', -- reglas que generaron el plan
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
select app.enable_owner_rls('public.nutrition_plans');

create table public.intake_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete cascade,
  date date not null,
  carbs_g_per_h numeric(5, 1),
  gi_tolerance smallint check (gi_tolerance between 0 and 10),
  weight_before_kg numeric(5, 2),
  weight_after_kg numeric(5, 2),
  fluid_ml integer,
  temperature_c numeric(4, 1),
  sweat_rate_l_per_h numeric(4, 2),     -- calculada a partir de pesos y líquido
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.intake_logs');
