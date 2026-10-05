/**
 * Semáforo de disponibilidad de la pantalla Hoy: sueño, FC en reposo frente a
 * tu media, dolor muscular y forma. Cada señal se evalúa por separado con su
 * regla visible; el semáforo global es la peor señal. Umbrales de partida,
 * configurables.
 */
export type Light = "green" | "amber" | "red";

export interface ReadinessInput {
  sleepH?: number | null;
  restingHr?: number | null;
  /** Media de FC en reposo de los últimos 7 días. */
  restingHrBaseline?: number | null;
  /** 0–10 */
  soreness?: number | null;
  /** Forma (TSB = fitness − fatiga). */
  form?: number | null;
}

export interface Signal {
  key: "sleep" | "restingHr" | "soreness" | "form";
  label: string;
  value: string;
  light: Light;
  rule: string;
}

export interface Readiness {
  light: Light;
  signals: Signal[];
}

const ORDER: readonly Light[] = ["green", "amber", "red"];

export function readiness(input: ReadinessInput): Readiness {
  const signals: Signal[] = [];
  const { sleepH, restingHr, restingHrBaseline, soreness, form } = input;

  if (sleepH != null) {
    signals.push({
      key: "sleep",
      label: "Sueño",
      value: `${sleepH.toFixed(1)} h`,
      light: sleepH >= 7 ? "green" : sleepH >= 6 ? "amber" : "red",
      rule: "≥ 7 h verde · 6–7 h ámbar · < 6 h rojo",
    });
  }
  if (restingHr != null && restingHrBaseline != null) {
    const delta = restingHr - restingHrBaseline;
    signals.push({
      key: "restingHr",
      label: "FC reposo",
      value: `${restingHr} ppm (${delta >= 0 ? "+" : ""}${Math.round(delta)})`,
      light: delta <= 3 ? "green" : delta <= 7 ? "amber" : "red",
      rule: "Frente a tu media de 7 días: ≤ +3 verde · +4 a +7 ámbar · > +7 rojo",
    });
  }
  if (soreness != null) {
    signals.push({
      key: "soreness",
      label: "Dolor muscular",
      value: `${soreness}/10`,
      light: soreness <= 3 ? "green" : soreness <= 6 ? "amber" : "red",
      rule: "0–3 verde · 4–6 ámbar · 7–10 rojo",
    });
  }
  if (form != null) {
    signals.push({
      key: "form",
      label: "Forma",
      value: `${form > 0 ? "+" : ""}${Math.round(form)}`,
      light: form >= -20 ? "green" : form >= -30 ? "amber" : "red",
      rule: "≥ −20 verde · −20 a −30 ámbar · < −30 rojo",
    });
  }

  const light = signals.reduce<Light>((worst, s) => (ORDER.indexOf(s.light) > ORDER.indexOf(worst) ? s.light : worst), "green");
  return { light, signals };
}
