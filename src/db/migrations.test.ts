import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Aplica las migraciones sobre un Postgres embebido (PGlite) con un esquema
 * auth mínimo que imita a Supabase, y comprueba que RLS aísla a los usuarios.
 * No sustituye a probarlas en Supabase, pero detecta errores de SQL y
 * tablas olvidadas sin RLS antes de llegar allí.
 */

const MIGRATIONS_DIR = join(__dirname, "../../supabase/migrations");
const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";

const AUTH_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role authenticated nologin;
  grant usage on schema public, auth, app to authenticated;
`;

let db: PGlite;

async function asUser<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(AUTH_STUB.replace(", app", ""));
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  await db.exec(`
    grant usage on schema app to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users values ('${ALICE}'), ('${BOB}');
  `);
});

afterAll(async () => {
  await db?.close();
});

describe("migraciones", () => {
  it("todas las tablas de public tienen user_id y RLS activado", async () => {
    const { rows } = await db.query<{ table_name: string; rls: boolean; has_user_id: boolean }>(`
      select c.relname as table_name, c.relrowsecurity as rls,
        exists (select 1 from information_schema.columns col
                where col.table_schema = 'public' and col.table_name = c.relname and col.column_name = 'user_id') as has_user_id
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by 1
    `);
    expect(rows.length).toBeGreaterThanOrEqual(20);
    for (const r of rows) {
      expect(r, r.table_name).toMatchObject({ rls: true, has_user_id: true });
    }
  });

  it("cada usuario solo ve sus filas", async () => {
    await asUser(ALICE, () =>
      db.exec(`insert into public.wellness (date, sleep_h, resting_hr) values ('2026-10-05', 7.5, 46)`),
    );
    await asUser(BOB, () =>
      db.exec(`insert into public.wellness (date, sleep_h, resting_hr) values ('2026-10-05', 6, 52)`),
    );
    const alice = await asUser(ALICE, () => db.query<{ resting_hr: number }>(`select resting_hr from public.wellness`));
    expect(alice.rows).toEqual([{ resting_hr: 46 }]);
    const bob = await asUser(BOB, () => db.query<{ resting_hr: number }>(`select resting_hr from public.wellness`));
    expect(bob.rows).toEqual([{ resting_hr: 52 }]);
  });

  it("no se puede insertar a nombre de otro usuario", async () => {
    await expect(
      asUser(ALICE, () =>
        db.exec(`insert into public.wellness (user_id, date) values ('${BOB}', '2026-10-06')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("no se pueden modificar ni borrar filas ajenas", async () => {
    await asUser(BOB, async () => {
      await db.exec(`update public.wellness set resting_hr = 99`);
      await db.exec(`delete from public.wellness`);
    });
    const { rows } = await db.query<{ resting_hr: number }>(`select resting_hr from public.wellness order by resting_hr`);
    // Bob borró la suya; la de Alice sigue intacta.
    expect(rows).toEqual([{ resting_hr: 46 }]);
  });

  it("anónimo no ve nada", async () => {
    const { rows } = await asUser("", () => db.query(`select * from public.wellness`));
    expect(rows).toEqual([]);
  });

  it("updated_at se actualiza solo", async () => {
    const { rows } = await asUser(ALICE, async () => {
      await db.exec(`update public.wellness set created_at = now() - interval '1 day', updated_at = now() - interval '1 day'`);
      await db.exec(`update public.wellness set soreness = 3`);
      return db.query<{ fresh: boolean }>(`select updated_at > created_at as fresh from public.wellness`);
    });
    expect(rows).toEqual([{ fresh: true }]);
  });
});
