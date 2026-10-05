/**
 * Nutrición periodizada: carbohidratos del día según tipo y duración de las
 * sesiones de hoy y de mañana ("comer para el trabajo que toca").
 * Rangos de partida de la especificación (ACSM, Burke, Jeukendrup, citados de
 * memoria y ajustables). Cada resultado devuelve la regla que lo generó.
 */

export type SessionType =
  | "rest"
  | "strength"
  | "climbing"
  | "aerobic"
  | "bike"
  | "quality"
  | "mountain"
  | "long"
  | "race";

export interface SessionInput {
  type: SessionType;
  durationMin: number;
}

export type DayBand = "rest" | "easy" | "moderate" | "long" | "carbLoad";

export interface Range {
  min: number;
  max: number;
}

export const DAY_BANDS: Record<DayBand, { label: string; carbsGPerKg: Range; proteinGPerKg: Range }> = {
  rest: { label: "Descanso o fuerza", carbsGPerKg: { min: 3, max: 5 }, proteinGPerKg: { min: 1.6, max: 2.0 } },
  easy: { label: "Aeróbico suave < 75'", carbsGPerKg: { min: 4, max: 6 }, proteinGPerKg: { min: 1.6, max: 2.0 } },
  moderate: { label: "Calidad o montaña 1,5–2,5 h", carbsGPerKg: { min: 6, max: 8 }, proteinGPerKg: { min: 1.6, max: 2.0 } },
  long: { label: "Larga > 2,5 h o doble sesión", carbsGPerKg: { min: 8, max: 10 }, proteinGPerKg: { min: 1.6, max: 2.0 } },
  carbLoad: { label: "1–2 días antes de prueba A", carbsGPerKg: { min: 8, max: 10 }, proteinGPerKg: { min: 1.6, max: 1.6 } },
};

const BAND_ORDER: readonly DayBand[] = ["rest", "easy", "moderate", "long", "carbLoad"];

/** Fuerza y escalada van fuera del presupuesto aeróbico. */
const NON_AEROBIC: ReadonlySet<SessionType> = new Set(["rest", "strength", "climbing"]);

export function sessionBand(s: SessionInput): DayBand {
  if (NON_AEROBIC.has(s.type) || s.durationMin <= 0) return "rest";
  if (s.type === "race" || s.type === "long" || s.durationMin > 150) return "long";
  if (s.type === "quality" || s.type === "mountain") return "moderate";
  return s.durationMin < 75 ? "easy" : "moderate";
}

export interface DayCarbsInput {
  weightKg: number;
  today: readonly SessionInput[];
  tomorrow?: readonly SessionInput[];
  /** Hoy es 1–2 días antes de una prueba A. */
  preRaceA?: boolean;
}

export interface DayCarbsResult {
  band: DayBand;
  label: string;
  carbsGPerKg: Range;
  carbsG: Range;
  /** Objetivo puntual: el centro del rango, redondeado a 10 g. */
  carbsTargetG: number;
  proteinG: Range;
  /** Explicación legible de por qué sale esta banda. */
  reasons: string[];
}

export function dayCarbs(input: DayCarbsInput): DayCarbsResult {
  const { weightKg, today, tomorrow = [], preRaceA = false } = input;
  const reasons: string[] = [];
  let band: DayBand = "rest";

  const aerobicToday = today.filter((s) => !NON_AEROBIC.has(s.type) && s.durationMin > 0);
  for (const s of today) band = maxBand(band, sessionBand(s));
  reasons.push(today.length ? `Hoy: ${today.map(describe).join(" + ")} → ${DAY_BANDS[band].label}` : "Hoy sin sesión → descanso");

  if (aerobicToday.length >= 2 && band !== "long") {
    band = "long";
    reasons.push("Doble sesión aeróbica → banda de larga");
  }

  // Mañana pesa sobre hoy: llegar con el glucógeno lleno a la larga o la carrera.
  const tomorrowBand = tomorrow.reduce<DayBand>((b, s) => maxBand(b, sessionBand(s)), "rest");
  if (tomorrowBand === "long" && rank(band) < rank("moderate")) {
    band = "moderate";
    reasons.push("Mañana larga o carrera → mínimo 6–8 g/kg hoy");
  } else if (tomorrowBand === "moderate" && rank(band) < rank("easy")) {
    band = "easy";
    reasons.push("Mañana calidad o montaña → mínimo 4–6 g/kg hoy");
  }

  if (preRaceA) {
    band = "carbLoad";
    reasons.push("1–2 días antes de prueba A → carga de carbohidratos");
  }

  const def = DAY_BANDS[band];
  const carbsG = { min: Math.round(def.carbsGPerKg.min * weightKg), max: Math.round(def.carbsGPerKg.max * weightKg) };
  return {
    band,
    label: def.label,
    carbsGPerKg: def.carbsGPerKg,
    carbsG,
    carbsTargetG: Math.round((carbsG.min + carbsG.max) / 2 / 10) * 10,
    proteinG: { min: Math.round(def.proteinGPerKg.min * weightKg), max: Math.round(def.proteinGPerKg.max * weightKg) },
    reasons,
  };
}

export interface IntraSessionFuel {
  carbsGPerHour: Range;
  note: string;
}

/** Carbohidratos durante el esfuerzo según duración. */
export function intraSessionCarbs(s: SessionInput): IntraSessionFuel {
  if (s.type === "race" || s.durationMin > 150)
    return { carbsGPerHour: { min: 60, max: 90 }, note: "Mezcla glucosa:fructosa; entrenamiento intestinal +10 g/h cada 1–2 largas" };
  if (s.durationMin >= 60) return { carbsGPerHour: { min: 30, max: 60 }, note: "30–60 g/h" };
  return { carbsGPerHour: { min: 0, max: 0 }, note: "Agua" };
}

/** Recuperación tras calidad o larga: 1–1,2 g/kg CHO y ~0,3 g/kg proteína en 2 h. */
export function recoveryFuel(s: SessionInput, weightKg: number): { carbsG: Range; proteinG: number } | null {
  const band = sessionBand(s);
  if (s.type !== "quality" && band !== "long") return null;
  return {
    carbsG: { min: Math.round(weightKg * 1), max: Math.round(weightKg * 1.2) },
    proteinG: Math.round(weightKg * 0.3),
  };
}

function rank(b: DayBand): number {
  return BAND_ORDER.indexOf(b);
}

function maxBand(a: DayBand, b: DayBand): DayBand {
  return rank(a) >= rank(b) ? a : b;
}

const TYPE_LABEL: Record<SessionType, string> = {
  rest: "descanso",
  strength: "fuerza",
  climbing: "escalada",
  aerobic: "aeróbico",
  bike: "bici",
  quality: "calidad",
  mountain: "montaña",
  long: "larga",
  race: "carrera",
};

function describe(s: SessionInput): string {
  return s.durationMin > 0 ? `${TYPE_LABEL[s.type]} ${s.durationMin}'` : TYPE_LABEL[s.type];
}
