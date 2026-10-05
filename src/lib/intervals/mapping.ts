import type { SessionType } from "../calc/nutrition";
import { toIntervalsDescription } from "../workouts/intervalsText";
import { workoutSeconds } from "../workouts/duration";
import type { StructuredWorkout } from "../workouts/types";
import type { IntervalsActivity, IntervalsEventInput } from "./types";

/** Evento de calendario para un entrenamiento creado en la app. */
export function workoutToEvent(w: StructuredWorkout, externalId?: string): IntervalsEventInput {
  const event: IntervalsEventInput = {
    category: "WORKOUT",
    start_date_local: `${w.date}T00:00:00`,
    type: w.sport,
    name: w.name,
    description: toIntervalsDescription(w),
    target: "HR",
    external_id: externalId ?? `app:${w.date}:${slug(w.name)}`,
  };
  const secs = workoutSeconds(w);
  if (secs > 0) event.moving_time = secs;
  return event;
}

/**
 * Tipo de sesión de la app a partir de una actividad de intervals.icu.
 * La calidad no se puede deducir solo del deporte: se marca como aeróbico y
 * se reclasifica al casar la actividad con la sesión planificada.
 */
export function activitySessionType(a: IntervalsActivity): SessionType {
  const type = (a.type ?? "").toLowerCase();
  const hours = (a.moving_time ?? 0) / 3600;
  if (type.includes("weight") || type.includes("workout")) return "strength";
  if (type.includes("climb")) return "climbing";
  if (type.includes("ride") || type.includes("bike")) return "bike";
  if (type === "hike" || type.includes("mountaineering") || type.includes("backcountry")) return hours > 2.5 ? "long" : "mountain";
  if (type.includes("run")) {
    if (hours > 2.5) return "long";
    const gainPerKm = a.distance ? (a.total_elevation_gain ?? 0) / (a.distance / 1000) : 0;
    return gainPerKm >= 40 && hours >= 1.25 ? "mountain" : "aerobic";
  }
  return "aerobic";
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
