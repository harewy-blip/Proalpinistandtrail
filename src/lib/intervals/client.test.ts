import { describe, expect, it } from "vitest";
import { sampleWeek } from "../sample/week";
import {
  IntervalsApiError,
  IntervalsClient,
  IntervalsConfigError,
  hasIntervalsCredentials,
  intervalsClientFromEnv,
  isStravaStub,
  streamsToTrack,
} from "./client";
import activities from "./fixtures/activities.json";
import events from "./fixtures/events.json";
import streams from "./fixtures/streams.json";
import wellness from "./fixtures/wellness.json";
import { activitySessionType, workoutToEvent } from "./mapping";
import { mockFetch } from "./mockFetch";
import type { IntervalsActivity, IntervalsStream } from "./types";

const ATHLETE = "i123456";
const KEY = "secreta123";
const noSleep = async () => {};

function client(routes: Parameters<typeof mockFetch>[0]) {
  const m = mockFetch(routes);
  return { c: new IntervalsClient({ athleteId: ATHLETE, apiKey: KEY, fetch: m.fetch, sleep: noSleep }), calls: m.calls };
}

describe("configuración", () => {
  it("lee credenciales del entorno", () => {
    const env = { INTERVALS_ATHLETE_ID: ATHLETE, INTERVALS_API_KEY: KEY };
    expect(intervalsClientFromEnv(env)).toBeInstanceOf(IntervalsClient);
    expect(hasIntervalsCredentials(env)).toBe(true);
  });
  it("falla claro si faltan", () => {
    expect(() => intervalsClientFromEnv({ INTERVALS_ATHLETE_ID: ATHLETE })).toThrow(IntervalsConfigError);
    expect(hasIntervalsCredentials({ INTERVALS_API_KEY: " " })).toBe(false);
  });
});

describe("autenticación y transporte", () => {
  it("Basic con usuario API_KEY y la key como contraseña", async () => {
    const { c, calls } = client({ [`GET /api/v1/athlete/${ATHLETE}/activities`]: { body: [] } });
    await c.listActivities({ oldest: "2026-09-01" });
    expect(calls[0]!.headers.Authorization).toBe(`Basic ${Buffer.from(`API_KEY:${KEY}`).toString("base64")}`);
  });

  it("reintenta ante 429 respetando Retry-After y luego responde", async () => {
    const waits: number[] = [];
    const m = mockFetch({
      [`GET /api/v1/athlete/${ATHLETE}/wellness.json`]: [{ status: 429, headers: { "Retry-After": "2" } }, { status: 503 }, { body: wellness }],
    });
    const c = new IntervalsClient({ athleteId: ATHLETE, apiKey: KEY, fetch: m.fetch, sleep: async (ms) => void waits.push(ms) });
    const r = await c.listWellness();
    expect(r).toHaveLength(2);
    expect(waits).toEqual([2000, 1000]);
  });

  it("errores 4xx no se reintentan y llevan contexto", async () => {
    const { c, calls } = client({ [`GET /api/v1/activity/i1`]: { status: 403, body: "Forbidden" } });
    const err = await c.getActivity("i1").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(IntervalsApiError);
    expect((err as IntervalsApiError).status).toBe(403);
    expect((err as Error).message).toContain("GET /api/v1/activity/i1 → 403: Forbidden");
    expect(calls).toHaveLength(1);
  });

  it("agota los reintentos en 5xx", async () => {
    const { c, calls } = client({ [`GET /api/v1/activity/i1`]: { status: 500 } });
    await expect(c.getActivity("i1")).rejects.toThrow(IntervalsApiError);
    expect(calls).toHaveLength(3);
  });
});

describe("actividades y streams", () => {
  it("lista actividades por rango de fechas", async () => {
    const { c, calls } = client({ [`GET /api/v1/athlete/${ATHLETE}/activities`]: { body: activities } });
    const r = await c.listActivities({ oldest: "2026-09-28", newest: "2026-10-05", limit: 50 });
    expect(r.map((a) => a.id)).toEqual(["i98765432", "i98765100", "i98764001"]);
    expect(Object.fromEntries(calls[0]!.url.searchParams)).toEqual({ oldest: "2026-09-28", newest: "2026-10-05", limit: "50" });
  });

  it("detecta actividades de Strava vacías", () => {
    const acts = activities as IntervalsActivity[];
    expect(acts.map(isStravaStub)).toEqual([false, true, false]);
  });

  it("pide los tipos de stream separados por comas", async () => {
    const { c, calls } = client({ "GET /api/v1/activity/i98765432/streams.json": { body: streams } });
    const track = await c.getActivityTrack("i98765432");
    expect(calls[0]!.url.searchParams.get("types")).toBe("time,distance,altitude,fixed_altitude,heartrate,latlng");
    expect(track.length).toBe(5);
  });

  it("streamsToTrack: altitud corregida, lat en data y lng en data2, huecos de GPS y FC 0", () => {
    const track = streamsToTrack(streams as IntervalsStream[]);
    // la muestra 5 no tiene fixed_altitude y se descarta
    expect(track.map((p) => p.t)).toEqual([0, 1, 2, 3, 4]);
    expect(track[0]).toEqual({ t: 0, alt: 638, dist: 0, hr: 128, lat: 40.400012, lng: -3.900001 });
    expect(track[2]).toEqual({ t: 2, alt: 638.5, dist: 4.9 });
  });

  it("sin altitud no hay track", () => {
    expect(streamsToTrack([{ type: "time", data: [0, 1] }])).toEqual([]);
  });

  it("tipo de sesión desde la actividad", () => {
    const acts = activities as IntervalsActivity[];
    expect(activitySessionType(acts[0]!)).toBe("mountain");
    expect(activitySessionType(acts[2]!)).toBe("strength");
    expect(activitySessionType({ id: "x", start_date_local: "", type: "Run", moving_time: 3000, distance: 10000, total_elevation_gain: 50 })).toBe("aerobic");
    expect(activitySessionType({ id: "x", start_date_local: "", type: "TrailRun", moving_time: 10800 })).toBe("long");
  });
});

describe("wellness", () => {
  it("lista por fechas", async () => {
    const { c, calls } = client({ [`GET /api/v1/athlete/${ATHLETE}/wellness.json`]: { body: wellness } });
    const r = await c.listWellness({ oldest: "2026-10-04", newest: "2026-10-05" });
    expect(r[1]).toMatchObject({ id: "2026-10-05", restingHR: 46, sleepSecs: 27360 });
    expect(calls[0]!.url.search).toBe("?oldest=2026-10-04&newest=2026-10-05");
  });

  it("actualiza solo los campos enviados", async () => {
    const { c, calls } = client({
      [`PUT /api/v1/athlete/${ATHLETE}/wellness/2026-10-05`]: (req) => ({ body: { id: "2026-10-05", ...(req.body as object) } }),
    });
    await c.updateWellness("2026-10-05", { soreness: 4, comments: "Gemelos cargados" });
    expect(calls[0]!.body).toEqual({ soreness: 4, comments: "Gemelos cargados" });
    expect(calls[0]!.headers["Content-Type"]).toBe("application/json");
  });
});

describe("calendario", () => {
  const quality = sampleWeek("2026-10-05")[1]!;

  it("lista eventos filtrando por categoría", async () => {
    const { c, calls } = client({ [`GET /api/v1/athlete/${ATHLETE}/events`]: { body: events } });
    const r = await c.listEvents({ oldest: "2026-10-05", newest: "2026-10-11", category: ["WORKOUT", "RACE_A"] });
    expect(r).toHaveLength(2);
    expect(calls[0]!.url.searchParams.get("category")).toBe("WORKOUT,RACE_A");
  });

  it("workoutToEvent: texto del Workout Builder en description y duración", () => {
    const e = workoutToEvent(quality);
    expect(e).toMatchObject({
      category: "WORKOUT",
      start_date_local: "2026-10-06T00:00:00",
      type: "TrailRun",
      name: "3×10' Z3 en subida",
      moving_time: 4500,
      target: "HR",
      external_id: "app:2026-10-06:3-10-z3-en-subida",
    });
    expect(e.description).toContain("Main Set 3x\n- Subida 10m Z3 HR\n- Bajada trote 5m Z1 HR");
  });

  it("crea un evento estructurado", async () => {
    const { c, calls } = client({
      [`POST /api/v1/athlete/${ATHLETE}/events`]: (req) => ({ body: { id: 70009999, ...(req.body as object) } }),
    });
    const created = await c.createEvent(workoutToEvent(quality));
    expect(created.id).toBe(70009999);
    expect(calls[0]!.body).toMatchObject({ category: "WORKOUT", name: "3×10' Z3 en subida" });
  });

  it("creación masiva con upsert", async () => {
    const { c, calls } = client({ [`POST /api/v1/athlete/${ATHLETE}/events/bulk`]: { body: [] } });
    await c.createEvents(sampleWeek("2026-10-05").map((w) => workoutToEvent(w)), { upsert: true });
    expect(calls[0]!.url.searchParams.get("upsert")).toBe("true");
    expect((calls[0]!.body as unknown[]).length).toBe(7);
  });

  it("upsertEvent actualiza si ya existe ese external_id", async () => {
    const { c, calls } = client({
      [`GET /api/v1/athlete/${ATHLETE}/events`]: { body: events },
      [`PUT /api/v1/athlete/${ATHLETE}/events/70001234`]: (req) => ({ body: { id: 70001234, ...(req.body as object) } }),
    });
    const r = await c.upsertEvent({ ...workoutToEvent(quality), external_id: "app:2026-10-06:3-10-z3-en-subida" });
    expect(r.id).toBe(70001234);
    expect(calls.map((x) => x.method)).toEqual(["GET", "PUT"]);
    expect(Object.fromEntries(calls[0]!.url.searchParams)).toEqual({ oldest: "2026-10-06", newest: "2026-10-06", category: "WORKOUT" });
  });

  it("upsertEvent crea si no existe", async () => {
    const { c, calls } = client({
      [`GET /api/v1/athlete/${ATHLETE}/events`]: { body: [] },
      [`POST /api/v1/athlete/${ATHLETE}/events`]: { body: { id: 1 } },
    });
    await c.upsertEvent({ ...workoutToEvent(quality), external_id: "nuevo" });
    expect(calls.map((x) => x.method)).toEqual(["GET", "POST"]);
  });

  it("borra un evento (respuesta vacía)", async () => {
    const { c } = client({ [`DELETE /api/v1/athlete/${ATHLETE}/events/5`]: { status: 200, body: "" } });
    await expect(c.deleteEvent(5)).resolves.toBeUndefined();
  });
});
