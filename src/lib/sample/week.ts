import type { StructuredWorkout } from "../workouts/types";

/** Lunes de la semana que contiene `date` (YYYY-MM-DD). */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const min = (m: number) => m * 60;

/**
 * Semana tipo de base, construida con las reglas de arquitectura de la
 * especificación: calidad solo el martes, ~72 h hasta la larga de montaña
 * del sábado, nunca calidad y montaña en días consecutivos, fuerza fuera del
 * presupuesto aeróbico.
 */
export function sampleWeek(anyDateInWeek: string): StructuredWorkout[] {
  const mon = mondayOf(anyDateInWeek);
  return [
    {
      date: mon,
      name: "Fuerza de montaña",
      type: "strength",
      sport: "WeightTraining",
      physiologicalGoal: "Fuerza específica y tolerancia excéntrica",
      premises: ["Step-up con carga 4×8", "Búlgara 3×10", "Gemelo excéntrico 3×15"],
      isKey: true,
      plannedDurationS: min(45),
      sections: [],
    },
    {
      date: addDays(mon, 1),
      name: "3×10' Z3 en subida",
      type: "quality",
      sport: "TrailRun",
      physiologicalGoal: "Tempo en subida: elevar el umbral aeróbico sin entrar en zona roja",
      premises: ["Subida continua ≥ 10' (ruta del Chalo)", "Bajadas de recuperación al trote, sin frenar"],
      isKey: true,
      sections: [
        { title: "Warmup", items: [{ kind: "step", durationS: min(20), target: { kind: "hrZone", zone: "Z1" } }] },
        {
          title: "Main Set",
          items: [
            {
              kind: "repeat",
              times: 3,
              steps: [
                { kind: "step", label: "Subida", durationS: min(10), target: { kind: "hrZone", zone: "Z3" } },
                { kind: "step", label: "Bajada trote", durationS: min(5), target: { kind: "hrZone", zone: "Z1" } },
              ],
            },
          ],
        },
        { title: "Cooldown", items: [{ kind: "step", durationS: min(10), target: { kind: "hrZone", zone: "Z1" } }] },
      ],
    },
    {
      date: addDays(mon, 2),
      name: "Rodaje Z2",
      type: "aerobic",
      sport: "Run",
      physiologicalGoal: "Base aeróbica",
      premises: ["Llano o pista", "Conversacional"],
      isKey: false,
      sections: [{ title: "Main Set", items: [{ kind: "step", durationS: min(50), target: { kind: "hrZone", zone: "Z2" } }] }],
    },
    {
      date: addDays(mon, 3),
      name: "Bici suave",
      type: "bike",
      sport: "Ride",
      physiologicalGoal: "Volumen aeróbico sin impacto",
      premises: [],
      isKey: false,
      sections: [{ title: "Main Set", items: [{ kind: "step", durationS: min(60), target: { kind: "hrZoneRange", from: "Z1", to: "Z2" } }] }],
    },
    {
      date: addDays(mon, 4),
      name: "Descanso",
      type: "rest",
      sport: "Run",
      physiologicalGoal: "Llegar fresco a la larga",
      premises: ["Movilidad 15'"],
      isKey: false,
      sections: [],
    },
    {
      date: addDays(mon, 5),
      name: "Larga de montaña",
      type: "mountain",
      sport: "TrailRun",
      physiologicalGoal: "Resistencia aeróbica y tolerancia excéntrica en terreno de montaña",
      premises: ["Bajada activa: cadencia alta, sin frenar con los talones", "60 g/h de carbohidratos desde el minuto 45"],
      isKey: true,
      sections: [{ title: "Main Set", items: [{ kind: "step", durationS: min(210), target: { kind: "hrZoneRange", from: "Z1", to: "Z2" } }] }],
    },
    {
      date: addDays(mon, 6),
      name: "Rodaje regenerativo",
      type: "aerobic",
      sport: "Run",
      physiologicalGoal: "Recuperación activa",
      premises: ["Revisión semanal de 3' al terminar"],
      isKey: false,
      sections: [{ title: "Main Set", items: [{ kind: "step", durationS: min(45), target: { kind: "hrZone", zone: "Z1" } }] }],
    },
  ];
}
