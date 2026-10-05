import { haversine, smooth } from "./geo";
import { vam } from "./vam";
import type { TrackPoint } from "./types";

export interface ClimbSegment {
  startIdx: number;
  endIdx: number;
  gainM: number;
  distanceM: number;
  durationS: number;
  /** m/h */
  vam: number;
  avgHr: number | null;
  /** Pendiente media en %. */
  avgGradePct: number;
}

export function segmentMetrics(points: readonly TrackPoint[], startIdx: number, endIdx: number, gainM?: number): ClimbSegment {
  const a = points[startIdx]!;
  const b = points[endIdx]!;
  const durationS = b.t - a.t;
  const distanceM = b.dist - a.dist;
  const gain = gainM ?? positiveGain(points.slice(startIdx, endIdx + 1).map((p) => p.alt));
  let hrSum = 0;
  let hrN = 0;
  for (let i = startIdx; i <= endIdx; i++) {
    const hr = points[i]!.hr;
    if (hr !== undefined && hr > 0) {
      hrSum += hr;
      hrN++;
    }
  }
  return {
    startIdx,
    endIdx,
    gainM: Math.round(gain),
    distanceM: Math.round(distanceM),
    durationS,
    vam: vam(gain, durationS),
    avgHr: hrN ? Math.round(hrSum / hrN) : null,
    avgGradePct: distanceM > 0 ? Math.round(((b.alt - a.alt) / distanceM) * 1000) / 10 : 0,
  };
}

function positiveGain(alt: readonly number[]): number {
  let gain = 0;
  for (let i = 1; i < alt.length; i++) {
    const d = alt[i]! - alt[i - 1]!;
    if (d > 0) gain += d;
  }
  return gain;
}

const EDGE_TOLERANCE_M = 1.5;

export interface DetectClimbsOptions {
  /** Desnivel mínimo para considerar una subida (m). */
  minGainM?: number;
  /** Bajada tolerada dentro de una subida antes de cortarla (m). */
  dropToleranceM?: number;
  smoothWindow?: number;
}

/**
 * Detecta subidas continuas en una actividad. Una subida empieza en un mínimo
 * local y termina en el máximo alcanzado antes de que la altitud caiga más de
 * `dropToleranceM` por debajo de él; los rellanos o pequeños descensos dentro
 * de esa tolerancia no la rompen.
 */
export function detectClimbs(points: readonly TrackPoint[], opts: DetectClimbsOptions = {}): ClimbSegment[] {
  const { minGainM = 100, dropToleranceM = 15, smoothWindow = 5 } = opts;
  if (points.length < 2) return [];
  const alt = smooth(points.map((p) => p.alt), smoothWindow);
  const climbs: ClimbSegment[] = [];

  let lowIdx = 0;
  let highIdx = 0;
  for (let i = 1; i < alt.length; i++) {
    const a = alt[i]!;
    if (a > alt[highIdx]!) highIdx = i;
    // Por debajo del inicio: lo subido hasta aquí no pasó de la tolerancia
    // (si no, ya se habría cortado), así que la subida vuelve a empezar.
    if (a < alt[lowIdx]!) {
      lowIdx = i;
      highIdx = i;
      continue;
    }
    if (alt[highIdx]! - a > dropToleranceM) {
      pushClimb(lowIdx, highIdx);
      lowIdx = i;
      highIdx = i;
    }
  }
  pushClimb(lowIdx, highIdx);
  return climbs;

  function pushClimb(lo: number, hi: number) {
    if (hi <= lo) return;
    // Recorta los rellanos de los extremos: el mínimo de un llano con ruido
    // puede caer muy antes del pie de la subida, y el tiempo en el rellano
    // de arriba no es subida. Se corta donde la altitud se separa de verdad.
    const lowAlt = alt[lo]!;
    const highAlt = alt[hi]!;
    for (let j = lo; j < hi; j++) if (alt[j]! <= lowAlt + EDGE_TOLERANCE_M) lo = j;
    for (let j = hi; j > lo; j--) if (alt[j]! >= highAlt - EDGE_TOLERANCE_M) hi = j;
    const gain = alt[hi]! - alt[lo]!;
    if (gain >= minGainM) climbs.push(segmentMetrics(points, lo, hi, gain));
  }
}

/** Segmento de referencia guardado (p. ej. la subida al Chalo). */
export interface ReferenceSegment {
  id: string;
  name: string;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  distanceM: number;
  gainM: number;
}

export interface MatchOptions {
  /** Radio para considerar que se pasa por el inicio/fin (m). */
  radiusM?: number;
  /** Tolerancia relativa de distancia frente a la referencia (0,25 = ±25 %). */
  distanceTolerance?: number;
}

/**
 * Busca en una actividad los pasos por un segmento de referencia: entrar en
 * el radio del inicio, salir después por el radio del fin, y que la distancia
 * recorrida cuadre con la del segmento. Dentro de cada radio se toma el punto
 * más cercano para que el corte no dependa de la frecuencia de muestreo.
 * Devuelve todos los pasos (puede haber repeticiones en la misma salida).
 */
export function matchSegment(
  points: readonly TrackPoint[],
  ref: ReferenceSegment,
  opts: MatchOptions = {},
): ClimbSegment[] {
  const { radiusM = 40, distanceTolerance = 0.25 } = opts;
  const dStart: number[] = [];
  const dEnd: number[] = [];
  for (const p of points) {
    if (p.lat === undefined || p.lng === undefined) {
      dStart.push(Infinity);
      dEnd.push(Infinity);
    } else {
      dStart.push(haversine(p.lat, p.lng, ref.start.lat, ref.start.lng));
      dEnd.push(haversine(p.lat, p.lng, ref.end.lat, ref.end.lng));
    }
  }

  const results: ClimbSegment[] = [];
  let i = 0;
  while (i < points.length) {
    if (dStart[i]! > radiusM) {
      i++;
      continue;
    }
    // Punto más cercano al inicio dentro de esta pasada por el radio.
    let s = i;
    while (i < points.length && dStart[i]! <= radiusM) {
      if (dStart[i]! < dStart[s]!) s = i;
      i++;
    }
    const maxDist = points[s]!.dist + ref.distanceM * (1 + distanceTolerance);
    let j = i;
    while (j < points.length && dEnd[j]! > radiusM && points[j]!.dist <= maxDist) j++;
    if (j >= points.length || dEnd[j]! > radiusM) continue;
    let e = j;
    while (j < points.length && dEnd[j]! <= radiusM) {
      if (dEnd[j]! < dEnd[e]!) e = j;
      j++;
    }
    const dist = points[e]!.dist - points[s]!.dist;
    if (Math.abs(dist - ref.distanceM) <= ref.distanceM * distanceTolerance) {
      const alt = smooth(points.slice(s, e + 1).map((p) => p.alt), 5);
      results.push(segmentMetrics(points, s, e, positiveGain(alt)));
      i = j;
    }
  }
  return results;
}
