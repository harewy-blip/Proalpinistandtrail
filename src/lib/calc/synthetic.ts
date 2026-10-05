import type { TrackPoint } from "./types";

/** Tramo de un recorrido sintético: distancia horizontal, pendiente y ritmo. */
export interface SyntheticLeg {
  distanceM: number;
  gradePct: number;
  /** Velocidad horizontal en m/s. */
  speedMs: number;
  hr: number;
}

const M_PER_DEG_LAT = 111_195;

/**
 * Genera un track a 1 Hz recorriendo los tramos en línea recta hacia el norte.
 * Sirve para tests y para los datos de ejemplo de las pantallas.
 */
export function syntheticTrack(
  legs: readonly SyntheticLeg[],
  start = { lat: 40.0, lng: -3.0, alt: 600 },
  opts: { noiseM?: number; seed?: number } = {},
): TrackPoint[] {
  const { noiseM = 0, seed = 1 } = opts;
  const rand = mulberry32(seed);
  const pts: TrackPoint[] = [];
  let t = 0;
  let dist = 0;
  let alt = start.alt;
  pts.push({ t, dist, alt, lat: start.lat, lng: start.lng, hr: legs[0]?.hr ?? 120 });
  for (const leg of legs) {
    const steps = Math.max(1, Math.round(leg.distanceM / leg.speedMs));
    const dx = leg.distanceM / steps;
    for (let i = 0; i < steps; i++) {
      t += 1;
      dist += dx;
      alt += (dx * leg.gradePct) / 100;
      const noise = noiseM ? (rand() * 2 - 1) * noiseM : 0;
      pts.push({
        t,
        dist,
        alt: alt + noise,
        lat: start.lat + dist / M_PER_DEG_LAT,
        lng: start.lng,
        hr: leg.hr,
      });
    }
  }
  return pts;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
