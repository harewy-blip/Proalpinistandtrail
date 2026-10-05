-- Versiones de mí: segmentos de referencia, esfuerzos detectados y benchmarks.

-- Segmento de referencia detectable por GPS (p. ej. subida al Chalo).
create table public.segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  start_lat double precision not null,
  start_lng double precision not null,
  end_lat double precision not null,
  end_lng double precision not null,
  distance_m numeric(8, 1) not null check (distance_m > 0),
  elevation_gain_m numeric(7, 1) not null,
  match_radius_m smallint not null default 40,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.segments');

-- Cada paso detectado por un segmento dentro de una actividad.
create table public.segment_efforts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  segment_id uuid not null references public.segments (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  started_at timestamptz not null,
  start_index integer not null,
  end_index integer not null,
  duration_s integer not null,
  elevation_gain_m numeric(7, 1) not null,
  vam integer not null,
  avg_hr smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, segment_id, start_index)
);
select app.enable_owner_rls('public.segment_efforts');
create index segment_efforts_segment_idx on public.segment_efforts (user_id, segment_id, started_at desc);

create table public.benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  protocol text not null,
  metrics text[] not null,              -- p. ej. {'time_s','vam','avg_hr'}
  frequency text,                       -- 'cada 4 semanas', 'una vez por bloque'
  segment_id uuid references public.segments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.benchmarks');

create table public.benchmark_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  benchmark_id uuid not null references public.benchmarks (id) on delete cascade,
  date date not null,
  activity_id uuid references public.activities (id) on delete set null,
  segment_effort_id uuid references public.segment_efforts (id) on delete set null,
  metrics jsonb not null,               -- { "time_s": 1830, "vam": 708, "avg_hr": 165 }
  -- Condiciones para comparar solo lo comparable.
  temperature_c numeric(4, 1),
  sleep_h numeric(4, 2),
  form numeric(5, 1),                   -- forma (TSB) del día
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.benchmark_results');
