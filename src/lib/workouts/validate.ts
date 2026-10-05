import type { SessionType } from "../calc/nutrition";
import type { IntervalsSport, Repeat, Section, Step, StructuredWorkout, Target, ZoneId } from "./types";

/**
 * Valida un entrenamiento que llega del navegador antes de enviarlo a
 * intervals.icu. Devuelve el objeto limpio (sin campos desconocidos) o la
 * lista de errores legibles.
 */
export type ValidationResult = { ok: true; workout: StructuredWorkout } | { ok: false; errors: string[] };

const SESSION_TYPES: readonly SessionType[] = ["rest", "strength", "climbing", "aerobic", "bike", "quality", "mountain", "long", "race"];
const SPORTS: readonly IntervalsSport[] = ["Run", "TrailRun", "Hike", "Ride", "WeightTraining", "RockClimbing"];
const ZONES: readonly ZoneId[] = ["Z1", "Z2", "Z3", "Z4", "Z5"];
const MAX_STEP_S = 12 * 3600;
const MAX_TEXT = 300;

export function validateWorkout(input: unknown): ValidationResult {
  const errors: string[] = [];
  const o = obj(input);
  if (!o) return { ok: false, errors: ["El entrenamiento debe ser un objeto"] };

  const date = str(o.date);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.push("Fecha inválida (YYYY-MM-DD)");
  const name = str(o.name)?.trim();
  if (!name) errors.push("Falta el nombre");
  else if (name.length > 120) errors.push("Nombre demasiado largo");
  const type = str(o.type) as SessionType | undefined;
  if (!type || !SESSION_TYPES.includes(type)) errors.push("Tipo de sesión inválido");
  const sport = str(o.sport) as IntervalsSport | undefined;
  if (!sport || !SPORTS.includes(sport)) errors.push("Deporte inválido");

  const premises = Array.isArray(o.premises) ? o.premises.filter((p): p is string => typeof p === "string").map((p) => p.slice(0, MAX_TEXT)) : [];
  const sectionsIn = Array.isArray(o.sections) ? o.sections : [];
  if (sectionsIn.length > 10) errors.push("Demasiadas secciones");
  const sections: Section[] = [];
  sectionsIn.forEach((s, i) => {
    const sec = obj(s);
    const title = str(sec?.title)?.trim().slice(0, 40);
    if (!sec || !title) return void errors.push(`Sección ${i + 1}: falta el título`);
    const items: (Step | Repeat)[] = [];
    (Array.isArray(sec.items) ? sec.items : []).forEach((it, j) => {
      const where = `Sección ${i + 1}, paso ${j + 1}`;
      const io = obj(it);
      if (io?.kind === "repeat") {
        const times = io.times;
        if (typeof times !== "number" || !Number.isInteger(times) || times < 1 || times > 50) errors.push(`${where}: repeticiones entre 1 y 50`);
        const steps = (Array.isArray(io.steps) ? io.steps : []).map((st, k) => parseStep(st, `${where}.${k + 1}`, errors)).filter(Boolean) as Step[];
        if (!steps.length) errors.push(`${where}: la repetición no tiene pasos`);
        items.push({ kind: "repeat", times: times as number, steps });
      } else {
        const step = parseStep(it, where, errors);
        if (step) items.push(step);
      }
    });
    sections.push({ title, items });
  });

  const plannedDurationS = typeof o.plannedDurationS === "number" && o.plannedDurationS > 0 && o.plannedDurationS <= MAX_STEP_S ? Math.round(o.plannedDurationS) : undefined;

  if (errors.length) return { ok: false, errors };
  const workout: StructuredWorkout = {
    date: date!,
    name: name!,
    type: type!,
    sport: sport!,
    physiologicalGoal: (str(o.physiologicalGoal) ?? "").slice(0, MAX_TEXT),
    premises,
    isKey: o.isKey === true,
    sections,
  };
  if (plannedDurationS) workout.plannedDurationS = plannedDurationS;
  return { ok: true, workout };
}

function parseStep(input: unknown, where: string, errors: string[]): Step | null {
  const o = obj(input);
  if (!o || o.kind !== "step") {
    errors.push(`${where}: paso inválido`);
    return null;
  }
  const step: Step = { kind: "step" };
  const label = str(o.label)?.trim();
  if (label) step.label = label.slice(0, 40);
  if (o.durationS !== undefined) {
    if (typeof o.durationS !== "number" || o.durationS <= 0 || o.durationS > MAX_STEP_S) errors.push(`${where}: duración inválida`);
    else step.durationS = Math.round(o.durationS);
  }
  if (o.distanceM !== undefined) {
    if (typeof o.distanceM !== "number" || o.distanceM <= 0 || o.distanceM > 200_000) errors.push(`${where}: distancia inválida`);
    else step.distanceM = Math.round(o.distanceM);
  }
  if (!step.durationS && !step.distanceM && o.lapButton !== true) errors.push(`${where}: indica duración o distancia`);
  if (o.lapButton === true) step.lapButton = true;
  if (o.target !== undefined) {
    const t = parseTarget(o.target);
    if (!t) errors.push(`${where}: objetivo inválido`);
    else step.target = t;
  }
  return step;
}

function parseTarget(input: unknown): Target | null {
  const o = obj(input);
  if (!o) return null;
  if (o.kind === "hrZone" && ZONES.includes(o.zone as ZoneId)) return { kind: "hrZone", zone: o.zone as ZoneId };
  if (o.kind === "hrZoneRange" && ZONES.includes(o.from as ZoneId) && ZONES.includes(o.to as ZoneId)) {
    if (ZONES.indexOf(o.from as ZoneId) > ZONES.indexOf(o.to as ZoneId)) return null;
    return { kind: "hrZoneRange", from: o.from as ZoneId, to: o.to as ZoneId };
  }
  if (o.kind === "lthrPct" && typeof o.min === "number" && typeof o.max === "number" && o.min >= 40 && o.max <= 120 && o.min <= o.max) {
    return { kind: "lthrPct", min: Math.round(o.min), max: Math.round(o.max) };
  }
  return null;
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
