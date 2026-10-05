import type { SessionType } from "../calc/nutrition";
import type { HrZone } from "../calc/zones";

export type ZoneId = HrZone["zone"];

export type Target =
  | { kind: "hrZone"; zone: ZoneId }
  | { kind: "hrZoneRange"; from: ZoneId; to: ZoneId }
  /** Porcentaje de la FC umbral, p. ej. 85–89 */
  | { kind: "lthrPct"; min: number; max: number };

export interface Step {
  kind: "step";
  /** Texto corto que verá el reloj (p. ej. "Subida", "Rec"). */
  label?: string;
  durationS?: number;
  distanceM?: number;
  /** Paso que termina al pulsar vuelta en el reloj. */
  lapButton?: boolean;
  target?: Target;
}

export interface Repeat {
  kind: "repeat";
  times: number;
  steps: Step[];
}

export interface Section {
  /** Warmup, Main Set, Cooldown… Se exporta tal cual como cabecera. */
  title: string;
  items: (Step | Repeat)[];
}

/** Deporte de intervals.icu (determina cómo lo envía al reloj). */
export type IntervalsSport = "Run" | "TrailRun" | "Hike" | "Ride" | "WeightTraining" | "RockClimbing";

export interface StructuredWorkout {
  date: string; // YYYY-MM-DD
  name: string;
  type: SessionType;
  sport: IntervalsSport;
  physiologicalGoal: string;
  premises: string[];
  isKey: boolean;
  sections: Section[];
  /** Duración planificada si no se deduce de los pasos (fuerza, montaña libre). */
  plannedDurationS?: number;
}
