import { hrZonesFromThreshold } from "../calc/zones";

/**
 * Atleta de ejemplo. El peso es un supuesto para que los cálculos de
 * nutrición tengan números; la FC umbral es la provisional de la
 * especificación (185 ppm, pendiente de test).
 */
export const sampleAthlete = {
  name: "Tú",
  weightKg: 68,
  lthr: 185,
  lthrMethod: "estimate" as const,
  lthrValidFrom: "2026-09-01",
  zones: hrZonesFromThreshold(185),
  restingHrBaseline: 45,
};
