import { smooth } from "./geo";
import type { TrackPoint } from "./types";

export type GhostAxis = "distance" | "elevation";

export interface GhostSample {
  /** Metros desde el inicio del segmento (distancia o desnivel acumulado). */
  x: number;
  current: { t: number; hr: number | null };
  ghost: { t: number; hr: number | null };
  /** Segundos de ventaja (negativo) o retraso (positivo) frente al fantasma. */
  deltaS: number;
}

/**
 * Alinea dos intentos del mismo segmento para la gráfica fantasma. Ambos se
 * re-muestrean sobre un eje común (distancia recorrida o altura ganada sobre
 * el inicio) cada `stepM` metros, interpolando linealmente tiempo y FC.
 * Alinear por posición y no por tiempo es lo que permite decir "en el metro
 * 200 de desnivel ibas 40 s por delante y con 5 ppm menos".
 *
 * El eje de desnivel es más robusto en subidas: no depende de la precisión
 * horizontal del GPS ni de pequeñas variaciones de trazado.
 */
export function alignAttempts(
  current: readonly TrackPoint[],
  ghost: readonly TrackPoint[],
  axis: GhostAxis = "distance",
  stepM = 10,
): GhostSample[] {
  const a = toSeries(current, axis);
  const b = toSeries(ghost, axis);
  const len = Math.min(a.x[a.x.length - 1] ?? 0, b.x[b.x.length - 1] ?? 0);
  const out: GhostSample[] = [];
  for (let x = 0; x <= len + 1e-9; x += stepM) {
    const ca = sampleAt(a, x);
    const gb = sampleAt(b, x);
    out.push({ x, current: ca, ghost: gb, deltaS: Math.round((ca.t - gb.t) * 10) / 10 });
  }
  return out;
}

interface Series {
  x: number[];
  t: number[];
  hr: (number | null)[];
}

function toSeries(points: readonly TrackPoint[], axis: GhostAxis): Series {
  const s: Series = { x: [], t: [], hr: [] };
  if (!points.length) return s;
  const p0 = points[0]!;
  // Eje de desnivel: altura ganada sobre el inicio (máximo acumulado de la
  // altitud suavizada). Sumar cada subida punto a punto convertiría el ruido
  // del barómetro en desnivel y desalinearía los intentos.
  const alt = axis === "elevation" ? smooth(points.map((p) => p.alt), 9) : [];
  let gain = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (axis === "elevation") gain = Math.max(gain, alt[i]! - alt[0]!);
    const x = axis === "distance" ? p.dist - p0.dist : gain;
    // El eje debe ser estrictamente creciente para interpolar: se descartan
    // las muestras sin avance (parado, o rellano en el eje de desnivel).
    const last = s.x[s.x.length - 1];
    if (last !== undefined && x <= last) continue;
    s.x.push(x);
    s.t.push(p.t - p0.t);
    s.hr.push(p.hr ?? null);
  }
  return s;
}

function sampleAt(s: Series, x: number): { t: number; hr: number | null } {
  const n = s.x.length;
  if (n === 0) return { t: 0, hr: null };
  if (x <= s.x[0]!) return { t: s.t[0]!, hr: s.hr[0] ?? null };
  if (x >= s.x[n - 1]!) return { t: s.t[n - 1]!, hr: s.hr[n - 1] ?? null };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s.x[mid]! <= x) lo = mid;
    else hi = mid;
  }
  const f = (x - s.x[lo]!) / (s.x[hi]! - s.x[lo]!);
  const lerp = (u: number, v: number) => u + (v - u) * f;
  const h0 = s.hr[lo];
  const h1 = s.hr[hi];
  const hr = h0 != null && h1 != null ? Math.round(lerp(h0, h1)) : (h0 ?? h1 ?? null);
  return { t: Math.round(lerp(s.t[lo]!, s.t[hi]!) * 10) / 10, hr };
}
