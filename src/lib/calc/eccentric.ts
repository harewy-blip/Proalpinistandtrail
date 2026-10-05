import { smooth } from "./geo";
import type { TrackPoint } from "./types";

/**
 * Factor de ponderación de la bajada según pendiente (en %, valor absoluto).
 * La especificación pide "más peso > 15 %": la carga excéntrica sobre el
 * cuádriceps crece con la pendiente, y por encima del 15 % el frenado domina.
 * Los tramos y factores son valores de partida configurables, no ciencia
 * cerrada: el índice es propio y sirve para comparar contigo mismo.
 */
export interface SlopeBand {
  /** Pendiente mínima (%) a partir de la que aplica el factor. */
  minGrade: number;
  factor: number;
}

export const DEFAULT_SLOPE_BANDS: readonly SlopeBand[] = [
  { minGrade: 0, factor: 1 },
  { minGrade: 10, factor: 1.25 },
  { minGrade: 15, factor: 1.5 },
  { minGrade: 25, factor: 2 },
];

export function slopeFactor(gradePct: number, bands: readonly SlopeBand[] = DEFAULT_SLOPE_BANDS): number {
  const g = Math.abs(gradePct);
  let factor = 1;
  for (const band of bands) if (g >= band.minGrade) factor = band.factor;
  return factor;
}

export interface EccentricResult {
  /** Metros de bajada brutos (D−). */
  descentM: number;
  /** Σ metros de bajada × factor de pendiente. */
  load: number;
}

export interface EccentricOptions {
  bands?: readonly SlopeBand[];
  /** Ventana de suavizado de altitud en muestras. */
  smoothWindow?: number;
  /** Distancia horizontal mínima para calcular la pendiente de un tramo (m). */
  minSegmentM?: number;
  /** Cambio de altitud mínimo para cerrar un tramo (m). */
  hysteresisM?: number;
}

/**
 * Carga excéntrica de una actividad. Recorre el perfil suavizado en tramos de
 * al menos `minSegmentM` horizontales (la pendiente entre dos muestras a 1 m
 * es ruido) y `hysteresisM` de desnivel, y suma la bajada de cada tramo
 * multiplicada por el factor de su pendiente.
 */
export function eccentricLoad(points: readonly TrackPoint[], opts: EccentricOptions = {}): EccentricResult {
  const { bands = DEFAULT_SLOPE_BANDS, smoothWindow = 5, minSegmentM = 20, hysteresisM = 3 } = opts;
  if (points.length < 2) return { descentM: 0, load: 0 };

  const alt = smooth(points.map((p) => p.alt), smoothWindow);
  let descentM = 0;
  let load = 0;
  let anchor = 0;

  for (let i = 1; i < points.length; i++) {
    const horiz = points[i]!.dist - points[anchor]!.dist;
    const delta = alt[i]! - alt[anchor]!;
    const isLast = i === points.length - 1;
    // Histéresis: el tramo solo se cierra cuando hay distancia horizontal
    // suficiente y un cambio de altitud mayor que el ruido residual.
    if (!isLast && (horiz < minSegmentM || Math.abs(delta) < hysteresisM)) continue;
    if (delta < 0 && horiz > 0) {
      const drop = -delta;
      descentM += drop;
      load += drop * slopeFactor((drop / horiz) * 100, bands);
    }
    anchor = i;
  }
  return { descentM: round1(descentM), load: round1(load) };
}

export interface WeeklyEccentricCheck {
  thisWeek: number;
  avg4w: number;
  /** Variación respecto a la media de 4 semanas (0,12 = +12 %). */
  change: number;
  warn: boolean;
}

/**
 * Aviso de progresión: la v1 avisa si la carga excéntrica semanal supera en
 * más de ~10–15 % la media de las 4 semanas anteriores. Umbral por defecto
 * 12,5 %, configurable.
 */
export function checkWeeklyEccentric(
  thisWeek: number,
  previous4Weeks: readonly number[],
  threshold = 0.125,
): WeeklyEccentricCheck {
  const weeks = previous4Weeks.slice(-4);
  const avg4w = weeks.length ? weeks.reduce((a, b) => a + b, 0) / weeks.length : 0;
  const change = avg4w > 0 ? thisWeek / avg4w - 1 : 0;
  return { thisWeek, avg4w: round1(avg4w), change: Math.round(change * 1000) / 1000, warn: avg4w > 0 && change > threshold };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
