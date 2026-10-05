import type { StructuredWorkout } from "./types";

const min = (m: number) => m * 60;

export type WorkoutTemplate = Omit<StructuredWorkout, "date">;

/** Plantillas de partida del Programador. */
export const WORKOUT_TEMPLATES: Record<string, WorkoutTemplate> = {
  calidad: {
    name: "3×10' Z3 en subida",
    type: "quality",
    sport: "TrailRun",
    physiologicalGoal: "Tempo en subida: elevar el umbral aeróbico sin entrar en zona roja",
    premises: ["Subida continua ≥ 10'", "Bajadas de recuperación al trote, sin frenar"],
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
  xalo: {
    name: "Benchmark: Xalo a FC fija",
    type: "quality",
    sport: "TrailRun",
    physiologicalGoal: "Benchmark repetible: tiempo y VAM a la misma FC (Z2 alta)",
    premises: ["Subida continua de ~360 m a FC constante", "Mismo calentamiento cada vez", "Final de la semana 3 del ciclo"],
    isKey: true,
    sections: [
      { title: "Warmup", items: [{ kind: "step", durationS: min(15), target: { kind: "hrZone", zone: "Z1" } }] },
      { title: "Main Set", items: [{ kind: "step", label: "Xalo", lapButton: true, durationS: min(35), target: { kind: "lthrPct", min: 86, max: 89 } }] },
      { title: "Cooldown", items: [{ kind: "step", durationS: min(15), target: { kind: "hrZone", zone: "Z1" } }] },
    ],
  },
  umbral: {
    name: "Test de umbral en subida",
    type: "quality",
    sport: "TrailRun",
    physiologicalGoal: "Fijar la FC umbral: media de los últimos 20' de 30' al máximo sostenible",
    premises: ["Subida larga y regular", "Pulsa vuelta a los 10' para separar los últimos 20'"],
    isKey: true,
    sections: [
      { title: "Warmup", items: [{ kind: "step", durationS: min(20), target: { kind: "hrZoneRange", from: "Z1", to: "Z2" } }] },
      {
        title: "Main Set",
        items: [
          { kind: "step", label: "Test primeros", durationS: min(10), target: { kind: "hrZone", zone: "Z4" } },
          { kind: "step", label: "Test últimos", durationS: min(20), target: { kind: "hrZone", zone: "Z4" } },
        ],
      },
      { title: "Cooldown", items: [{ kind: "step", durationS: min(15), target: { kind: "hrZone", zone: "Z1" } }] },
    ],
  },
  rodaje: {
    name: "Rodaje Z2",
    type: "aerobic",
    sport: "Run",
    physiologicalGoal: "Base aeróbica",
    premises: ["Conversacional"],
    isKey: false,
    sections: [{ title: "Main Set", items: [{ kind: "step", durationS: min(50), target: { kind: "hrZone", zone: "Z2" } }] }],
  },
  larga: {
    name: "Larga de montaña",
    type: "mountain",
    sport: "TrailRun",
    physiologicalGoal: "Resistencia aeróbica y tolerancia excéntrica",
    premises: ["Bajada activa: cadencia alta, sin frenar con los talones", "60 g/h de carbohidratos desde el minuto 45"],
    isKey: true,
    sections: [{ title: "Main Set", items: [{ kind: "step", durationS: min(210), target: { kind: "hrZoneRange", from: "Z1", to: "Z2" } }] }],
  },
  fuerza: {
    name: "Fuerza de montaña",
    type: "strength",
    sport: "WeightTraining",
    physiologicalGoal: "Fuerza específica y tolerancia excéntrica",
    premises: ["Step-up con carga 4×8", "Búlgara 3×10", "Gemelo excéntrico 3×15"],
    isKey: true,
    plannedDurationS: min(45),
    sections: [],
  },
};

export const TEMPLATE_LABELS: Record<keyof typeof WORKOUT_TEMPLATES, string> = {
  calidad: "Calidad en subida",
  xalo: "Benchmark Xalo",
  umbral: "Test de umbral",
  rodaje: "Rodaje Z2",
  larga: "Larga de montaña",
  fuerza: "Fuerza",
};
