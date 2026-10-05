/**
 * Zonas de FC a partir de la FC umbral (LTHR), con los porcentajes de Friel
 * para carrera agrupados en cinco zonas. Valores de partida configurables:
 * cada test de umbral crea un conjunto nuevo con su fecha.
 */
export interface HrZone {
  zone: "Z1" | "Z2" | "Z3" | "Z4" | "Z5";
  label: string;
  /** ppm, inclusive */
  min: number;
  /** ppm, inclusive; null en la zona abierta superior */
  max: number | null;
}

const BOUNDS: readonly { zone: HrZone["zone"]; label: string; fromPct: number }[] = [
  { zone: "Z1", label: "Recuperación", fromPct: 0 },
  { zone: "Z2", label: "Aeróbico", fromPct: 0.85 },
  { zone: "Z3", label: "Tempo", fromPct: 0.9 },
  { zone: "Z4", label: "Umbral", fromPct: 0.95 },
  { zone: "Z5", label: "VO2max", fromPct: 1.0 },
];

export function hrZonesFromThreshold(lthr: number): HrZone[] {
  return BOUNDS.map((b, i) => {
    const next = BOUNDS[i + 1];
    return {
      zone: b.zone,
      label: b.label,
      min: i === 0 ? 0 : Math.ceil(lthr * b.fromPct),
      max: next ? Math.ceil(lthr * next.fromPct) - 1 : null,
    };
  });
}

export function zoneForHr(hr: number, zones: readonly HrZone[]): HrZone["zone"] {
  for (const z of zones) if (hr >= z.min && (z.max === null || hr <= z.max)) return z.zone;
  return "Z1";
}
