import { describe, expect, it } from "vitest";
import { sampleWeek } from "../sample/week";
import { mockFetch } from "./mockFetch";
import { intervalsStatus, sendWorkout } from "./sendWorkout";

const workout = sampleWeek("2026-10-05")[1]!;
const LIVE = { INTERVALS_ATHLETE_ID: "i1", INTERVALS_API_KEY: "k", APP_PASSCODE: "montaña" };

describe("sendWorkout", () => {
  it("sin credenciales: modo demo con el evento que se enviaría", async () => {
    const r = await sendWorkout({ workout }, null, {});
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ mode: "demo", event: { category: "WORKOUT", name: workout.name } });
  });

  it("entrenamiento inválido → 400 con errores", async () => {
    const r = await sendWorkout({ workout: { ...workout, date: "mañana" } }, null, {});
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ errors: ["Fecha inválida (YYYY-MM-DD)"] });
  });

  it("con credenciales pero sin APP_PASSCODE configurado se niega", async () => {
    const r = await sendWorkout({ workout }, "x", { INTERVALS_ATHLETE_ID: "i1", INTERVALS_API_KEY: "k" });
    expect(r.status).toBe(503);
  });

  it("código incorrecto → 401 y no llama a intervals.icu", async () => {
    const m = mockFetch({});
    const r = await sendWorkout({ workout }, "otro", LIVE, { fetch: m.fetch });
    expect(r.status).toBe(401);
    expect(m.calls).toHaveLength(0);
  });

  it("código correcto: crea el evento en intervals.icu", async () => {
    const m = mockFetch({
      "GET /api/v1/athlete/i1/events": { body: [] },
      "POST /api/v1/athlete/i1/events": (req) => ({ body: { id: 42, ...(req.body as object) } }),
    });
    const r = await sendWorkout({ workout }, "montaña", LIVE, { fetch: m.fetch });
    expect(r).toMatchObject({ status: 200, body: { mode: "live", event: { id: 42 } } });
  });

  it("error de intervals.icu → 502", async () => {
    const m = mockFetch({ "GET /api/v1/athlete/i1/events": { status: 401, body: "bad key" } });
    const r = await sendWorkout({ workout }, "montaña", LIVE, { fetch: m.fetch, retries: 0 });
    expect(r).toEqual({ status: 502, body: { error: "intervals.icu respondió 401" } });
  });

  it("status", () => {
    expect(intervalsStatus({})).toEqual({ configured: false, passcodeRequired: false });
    expect(intervalsStatus(LIVE)).toEqual({ configured: true, passcodeRequired: true });
  });
});
