/**
 * Reglas de arquitectura semanal de la especificación (configurables). Cada
 * aviso lleva el id de la regla y su texto, para que la recomendación nunca
 * sea una caja negra.
 */
import type { SessionType } from "./nutrition";

export interface PlannedDay {
  date: string; // YYYY-MM-DD
  type: SessionType;
  name?: string;
}

export interface RuleViolation {
  ruleId: string;
  rule: string;
  dates: string[];
  message: string;
}

export interface WeekRulesConfig {
  /** Día de la semana permitido para calidad (0 = domingo … 6 = sábado). */
  qualityWeekday: number;
}

const DEFAULTS: WeekRulesConfig = { qualityWeekday: 2 };
const HARD: ReadonlySet<SessionType> = new Set(["quality", "mountain", "long", "race"]);
const WEEKDAY = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function checkWeekRules(days: readonly PlannedDay[], config: Partial<WeekRulesConfig> = {}): RuleViolation[] {
  const cfg = { ...DEFAULTS, ...config };
  const out: RuleViolation[] = [];
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  for (const d of sorted) {
    if (d.type === "quality" && weekday(d.date) !== cfg.qualityWeekday) {
      out.push({
        ruleId: "quality_weekday",
        rule: `Calidad solo el ${WEEKDAY[cfg.qualityWeekday]}, con ~72 h hasta la larga de montaña`,
        dates: [d.date],
        message: `Calidad programada en ${WEEKDAY[weekday(d.date)]}`,
      });
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    if (daysBetween(a.date, b.date) === 1 && HARD.has(a.type) && HARD.has(b.type)) {
      out.push({
        ruleId: "no_consecutive_hard",
        rule: "Calidad y montaña con premisas nunca en días consecutivos",
        dates: [a.date, b.date],
        message: `${a.name ?? a.type} y ${b.name ?? b.type} en días seguidos`,
      });
    }
  }
  return out;
}

function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}
