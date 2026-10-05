import { checkWeeklyEccentric } from "./calc/eccentric";
import { dayCarbs, intraSessionCarbs, recoveryFuel, type SessionInput } from "./calc/nutrition";
import { readiness } from "./calc/readiness";
import type { HrZone } from "./calc/zones";
import { sampleAthlete, sampleEccentricWeeks, sampleWeek, sampleWellness } from "./sample";
import { workoutSeconds } from "./workouts/duration";
import type { StructuredWorkout, Target, ZoneId } from "./workouts/types";

/** Fecha local (YYYY-MM-DD) en la zona horaria del atleta. */
export function todayIn(timeZone = "Europe/Madrid", now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function toSessionInputs(w: StructuredWorkout | undefined): SessionInput[] {
  if (!w || w.type === "rest") return [];
  return [{ type: w.type, durationMin: Math.round(workoutSeconds(w) / 60) }];
}

/** Zonas que usa un entrenamiento, con sus límites en ppm. */
export function zonesUsed(w: StructuredWorkout, zones: readonly HrZone[]): HrZone[] {
  const ids = new Set<ZoneId>();
  const add = (t?: Target) => {
    if (!t) return;
    if (t.kind === "hrZone") ids.add(t.zone);
    if (t.kind === "hrZoneRange") {
      const order = zones.map((z) => z.zone);
      for (let i = order.indexOf(t.from); i >= 0 && i <= order.indexOf(t.to); i++) ids.add(order[i]!);
    }
  };
  for (const s of w.sections)
    for (const item of s.items) {
      if (item.kind === "step") add(item.target);
      else item.steps.forEach((st) => add(st.target));
    }
  return zones.filter((z) => ids.has(z.zone));
}

/**
 * Todo lo que necesita la pantalla Hoy. En la v1 sale de los datos de
 * ejemplo; cuando haya Supabase e intervals.icu, solo cambia el origen.
 */
export function getTodayView(today: string) {
  const athlete = sampleAthlete;
  const week = sampleWeek(today);
  const idx = week.findIndex((w) => w.date === today);
  const workout = week[idx];
  const tomorrow = idx >= 0 && idx < 6 ? week[idx + 1] : sampleWeek(addDay(today))[0];

  const wellness = sampleWellness(today);
  const last = wellness[wellness.length - 1]!;
  const prev7 = wellness.slice(-8, -1);
  const rhrBaseline = prev7.reduce((a, d) => a + d.restingHr, 0) / prev7.length;
  const form = Math.round((last.ctl - last.atl) * 10) / 10;

  const ready = readiness({
    sleepH: last.sleepH,
    restingHr: last.restingHr,
    restingHrBaseline: Math.round(rhrBaseline),
    soreness: last.soreness,
    form,
  });

  const todayInputs = toSessionInputs(workout);
  const nutrition = dayCarbs({ weightKg: athlete.weightKg, today: todayInputs, tomorrow: toSessionInputs(tomorrow) });
  const main = todayInputs[0];
  const intra = main ? intraSessionCarbs(main) : null;
  const recovery = main ? recoveryFuel(main, athlete.weightKg) : null;

  const ecc = sampleEccentricWeeks;
  const eccentric = checkWeeklyEccentric(ecc[ecc.length - 1]!.load, ecc.slice(0, -1).map((w) => w.load));

  return {
    today,
    athlete,
    week,
    workout,
    tomorrow,
    durationS: workout ? workoutSeconds(workout) : 0,
    zones: workout ? zonesUsed(workout, athlete.zones) : [],
    readiness: ready,
    wellness: { ...last, form },
    nutrition,
    intra,
    recovery,
    eccentric,
    eccentricWeeks: ecc,
  };
}

function addDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
