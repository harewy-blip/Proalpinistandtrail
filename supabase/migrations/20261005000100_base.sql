-- Base: tipos compartidos y utilidades de RLS.
-- Todas las tablas de la app llevan user_id con aislamiento por fila (RLS)
-- desde el primer día: pasar a multiusuario no debe exigir migraciones.

create schema if not exists app;

-- Mantiene updated_at en cada UPDATE.
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Activa RLS en una tabla con columna user_id y crea las cuatro políticas
-- estándar: cada usuario solo ve y modifica sus filas. Se usa
-- (select auth.uid()) para que Postgres lo evalúe una vez por consulta.
create or replace function app.enable_owner_rls(tbl regclass)
returns void
language plpgsql
as $$
declare
  t text := tbl::text;
  n text := replace(tbl::text, 'public.', '');
begin
  execute format('alter table %s enable row level security', t);
  execute format(
    'create policy %I on %s for select to authenticated using (user_id = (select auth.uid()))',
    n || '_select_own', t);
  execute format(
    'create policy %I on %s for insert to authenticated with check (user_id = (select auth.uid()))',
    n || '_insert_own', t);
  execute format(
    'create policy %I on %s for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
    n || '_update_own', t);
  execute format(
    'create policy %I on %s for delete to authenticated using (user_id = (select auth.uid()))',
    n || '_delete_own', t);
  execute format('create index if not exists %I on %s (user_id)', n || '_user_id_idx', t);
  execute format(
    'create trigger %I before update on %s for each row execute function app.touch_updated_at()',
    n || '_touch_updated_at', t);
end;
$$;

create type public.session_type as enum (
  'rest', 'strength', 'climbing', 'aerobic', 'bike', 'quality', 'mountain', 'long', 'race'
);

create type public.data_source as enum ('intervals', 'strava', 'coros', 'manual', 'app');

-- Utilidad solo para migraciones: nadie desde la API debe poder llamarla.
revoke all on function app.enable_owner_rls(regclass) from public;
