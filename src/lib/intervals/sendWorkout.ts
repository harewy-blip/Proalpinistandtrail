import { timingSafeEqual } from "node:crypto";
import { validateWorkout } from "../workouts/validate";
import { IntervalsApiError, hasIntervalsCredentials, intervalsClientFromEnv, type IntervalsClientOptions } from "./client";
import { workoutToEvent } from "./mapping";
import type { IntervalsEvent, IntervalsEventInput } from "./types";

type Env = Record<string, string | undefined>;

export interface SendResult {
  status: number;
  body:
    | { mode: "demo"; event: IntervalsEventInput }
    | { mode: "live"; event: IntervalsEvent }
    | { error: string; errors?: string[] };
}

export function intervalsStatus(env: Env = process.env) {
  return { configured: hasIntervalsCredentials(env), passcodeRequired: hasIntervalsCredentials(env) };
}

/**
 * Lógica de POST /api/intervals/events, separada de Next para poder testearla.
 *
 * - Sin credenciales de intervals.icu: modo demo, devuelve el evento que se
 *   enviaría sin llamar a nada.
 * - Con credenciales: exige APP_PASSCODE (cabecera x-app-passcode). Hasta que
 *   exista login con Supabase, es lo que impide que cualquiera con la URL
 *   escriba en tu calendario. Si falta APP_PASSCODE, se niega por defecto.
 */
export async function sendWorkout(
  payload: unknown,
  passcode: string | null,
  env: Env = process.env,
  clientOverrides: Partial<IntervalsClientOptions> = {},
): Promise<SendResult> {
  const workout = obj(payload)?.workout;
  const v = validateWorkout(workout);
  if (!v.ok) return { status: 400, body: { error: "Entrenamiento inválido", errors: v.errors } };
  const event = workoutToEvent(v.workout);

  if (!hasIntervalsCredentials(env)) return { status: 200, body: { mode: "demo", event } };

  const expected = env.APP_PASSCODE?.trim();
  if (!expected) return { status: 503, body: { error: "Falta APP_PASSCODE en el servidor: necesario para escribir en intervals.icu" } };
  if (!passcode || !safeEqual(passcode, expected)) return { status: 401, body: { error: "Código de acceso incorrecto" } };

  try {
    const client = intervalsClientFromEnv(env, clientOverrides);
    const created = await client.upsertEvent({ ...event, external_id: event.external_id! });
    return { status: 200, body: { mode: "live", event: created } };
  } catch (e) {
    if (e instanceof IntervalsApiError) return { status: 502, body: { error: `intervals.icu respondió ${e.status}` } };
    throw e;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
