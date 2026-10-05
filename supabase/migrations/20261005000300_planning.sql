-- Planificación: objetivos, bloques y sesiones planificadas.

create type public.goal_priority as enum ('A', 'B', 'C');
create type public.goal_kind as enum ('trail_short', 'trail_medium', 'mountain');
create type public.block_phase as enum ('base', 'specific', 'taper', 'transition');

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  priority public.goal_priority not null,
  date date not null,
  kind public.goal_kind not null,
  distance_m numeric(9, 1),
  elevation_gain_m numeric(7, 1),
  elevation_loss_m numeric(7, 1),
  max_altitude_m numeric(6, 1),
  technical_terrain text,
  target_time_s integer,
  mandatory_gear text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.goals');

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  phase public.block_phase not null,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  cycle_position smallint check (cycle_position between 1 and 4),  -- semana dentro del 3:1
  objective text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.blocks');

create type public.workout_origin as enum ('app', 'intervals');

create table public.planned_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  type public.session_type not null,
  name text not null,
  physiological_goal text,
  planned_duration_s integer check (planned_duration_s >= 0),
  -- Pasos del entrenamiento estructurado (ver src/lib/workouts).
  structure jsonb not null default '[]'::jsonb,
  premises text[] not null default '{}',  -- p. ej. 'bajada activa'
  is_key boolean not null default false,  -- sesión clave para la adherencia
  suggested_route_id uuid,
  block_id uuid references public.blocks (id) on delete set null,
  origin public.workout_origin not null default 'app',
  intervals_event_id bigint,              -- id del evento en el calendario de intervals.icu
  completed_activity_id uuid references public.activities (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select app.enable_owner_rls('public.planned_workouts');
create index planned_workouts_user_date_idx on public.planned_workouts (user_id, date);
create unique index planned_workouts_intervals_event_idx
  on public.planned_workouts (user_id, intervals_event_id) where intervals_event_id is not null;
