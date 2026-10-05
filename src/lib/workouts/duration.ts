import type { Repeat, Section, Step, StructuredWorkout } from "./types";

function stepSeconds(s: Step): number {
  return s.durationS ?? 0;
}

function itemSeconds(i: Step | Repeat): number {
  return i.kind === "step" ? stepSeconds(i) : i.times * i.steps.reduce((a, s) => a + stepSeconds(s), 0);
}

export function sectionSeconds(sec: Section): number {
  return sec.items.reduce((a, i) => a + itemSeconds(i), 0);
}

/** Duración total: la suma de pasos con tiempo, o la planificada si no hay. */
export function workoutSeconds(w: StructuredWorkout): number {
  const fromSteps = w.sections.reduce((a, s) => a + sectionSeconds(s), 0);
  return fromSteps > 0 ? fromSteps : (w.plannedDurationS ?? 0);
}

export function formatDuration(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.round((totalS % 3600) / 60);
  if (h === 0) return `${m}'`;
  return m ? `${h} h ${String(m).padStart(2, "0")}'` : `${h} h`;
}
