-- Núcleo: perfil, zonas con fecha de validez, actividades y wellness.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text,
  reference_weight_kg numeric(5, 2) check (reference_weight_kg > 0),
  timezone text not null default 'Europe/Madrid',
  -- Preferencias y umbrales configurables (aviso excéntrico, ACWR, etc.).
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.profiles');

-- Cada test crea un conjunto de zonas nuevo con su fecha. Las actividades
-- guardan el zone_set con el que se hicieron, así no se reescriben al cambiar.
create type public.zone_method as enum ('test', 'estimate');

create table public.zone_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  valid_from date not null,
  threshold_hr smallint not null check (threshold_hr between 100 and 230),
  max_hr smallint check (max_hr between 100 and 240),
  method public.zone_method not null,
  -- [{ "zone": "Z1", "min": 0, "max": 152 }, ...] en ppm
  zones jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, valid_from)
);
select app.enable_owner_rls('public.zone_sets');

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source public.data_source not null,
  external_id text,
  started_at timestamptz not null,
  type public.session_type not null,
  sport text,                         -- tipo original de la fuente (Run, TrailRun, Hike…)
  name text,
  duration_s integer not null check (duration_s >= 0),
  moving_time_s integer check (moving_time_s >= 0),
  distance_m numeric(10, 1),
  elevation_gain_m numeric(7, 1),
  elevation_loss_m numeric(7, 1),
  avg_hr smallint,
  max_hr smallint,
  load numeric(6, 1),                 -- hrTSS/TRIMP de intervals.icu; fuerza = 0 o valor fijo bajo
  eccentric_load numeric(8, 1),       -- Σ m bajada × factor de pendiente
  rpe smallint check (rpe between 1 and 10),
  zone_set_id uuid references public.zone_sets (id) on delete set null,
  route_id uuid,                      -- FK añadida en la migración de rutas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);
select app.enable_owner_rls('public.activities');
create index activities_user_started_idx on public.activities (user_id, started_at desc);

-- Streams aparte para que listar actividades no arrastre miles de muestras.
create table public.activity_streams (
  activity_id uuid primary key references public.activities (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Arrays alineados por índice, como los devuelve intervals.icu.
  time_s integer[] not null,
  altitude_m real[],
  distance_m real[],
  heartrate smallint[],
  latlng double precision[],          -- [lat0, lng0, lat1, lng1, ...]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.activity_streams');

create table public.wellness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  sleep_h numeric(4, 2),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  hrv numeric(5, 1),
  resting_hr smallint,
  weight_kg numeric(5, 2),
  soreness smallint check (soreness between 0 and 10),
  feeling smallint check (feeling between 1 and 5),
  notes text,
  source public.data_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
select app.enable_owner_rls('public.wellness');
