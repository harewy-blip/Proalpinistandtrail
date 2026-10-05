-- Material y rutas.

create table public.gear (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null,               -- zapatillas, bastones, crampones, cuerda, arva…
  name text not null,
  purchased_on date,
  manufactured_on date,
  lifespan_km integer,
  lifespan_years smallint,
  default_for public.session_type[] not null default '{}',
  retired_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.gear');

create table public.gear_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  gear_id uuid not null references public.gear (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gear_id, activity_id)
);
select app.enable_owner_rls('public.gear_usage');

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  gpx text,
  distance_m numeric(9, 1),
  elevation_gain_m numeric(7, 1),
  elevation_loss_m numeric(7, 1),
  avg_grade_up_pct numeric(4, 1),
  max_grade_up_pct numeric(4, 1),
  avg_grade_down_pct numeric(4, 1),
  max_grade_down_pct numeric(4, 1),
  steep_share_pct numeric(4, 1),        -- % de tramos > 15 %
  longest_climb_min numeric(5, 1),
  surface text[] not null default '{}', -- pista, sendero, técnico, roca, nieve
  tags text[] not null default '{}',    -- umbral_subida, vo2max, bajada_tecnica, benchmark…
  water_sources text,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.routes');

alter table public.activities
  add constraint activities_route_id_fkey foreign key (route_id) references public.routes (id) on delete set null;
alter table public.planned_workouts
  add constraint planned_workouts_suggested_route_id_fkey
  foreign key (suggested_route_id) references public.routes (id) on delete set null;
