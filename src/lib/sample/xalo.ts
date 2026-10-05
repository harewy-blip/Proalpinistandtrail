import { detectClimbs, type ClimbSegment } from "../calc/climb";
import { syntheticTrack, type SyntheticLeg } from "../calc/synthetic";
import type { TrackPoint } from "../calc/types";
import { addDays } from "./week";

/**
 * Subida de referencia de ejemplo: ~360 m continuos, como el monte Xalo (A Coruña) de la
 * especificación. Coordenadas ficticias.
 */
export const xaloReference = {
  id: "xalo",
  name: "Subida al monte Xalo",
  distanceM: 3900,
  gainM: 360,
};

export interface SampleEffort {
  id: string;
  date: string;
  label: string;
  monthsAgo: number;
  track: TrackPoint[];
  climb: ClimbSegment;
  temperatureC: number;
  sleepH: number;
  form: number;
}

/**
 * Perfil del Xalo en tramos: rampa inicial, tramo duro, rellano y final.
 * El ritmo por tramo escala con `fitness` (1 = intento de hoy).
 */
function xaloLegs(fitness: number, hrOffset: number): SyntheticLeg[] {
  const base: [number, number, number, number][] = [
    // distancia, pendiente %, velocidad m/s (hoy), FC
    [600, 0, 2.9, 138],
    [900, 7, 2.35, 160],
    [1200, 11, 1.85, 165],
    [400, 4, 2.6, 163],
    [1400, 10, 1.95, 166],
    [500, -6, 3.2, 150],
  ];
  return base.map(([distanceM, gradePct, v, hr]) => ({
    distanceM,
    gradePct,
    speedMs: gradePct > 0 ? v * fitness : v,
    hr: hr + hrOffset,
  }));
}

export function sampleXaloEfforts(today: string): SampleEffort[] {
  const attempts = [
    { monthsAgo: 12, fitness: 0.82, hrOffset: 3, temperatureC: 14, sleepH: 7.0, form: -6 },
    { monthsAgo: 6, fitness: 0.89, hrOffset: 2, temperatureC: 19, sleepH: 7.5, form: -9 },
    { monthsAgo: 3, fitness: 0.95, hrOffset: 1, temperatureC: 22, sleepH: 6.8, form: -12 },
    { monthsAgo: 0, fitness: 1, hrOffset: 0, temperatureC: 16, sleepH: 7.4, form: -8 },
  ];
  return attempts.map((a, i) => {
    const track = syntheticTrack(xaloLegs(a.fitness, a.hrOffset), { lat: 40.4, lng: -3.9, alt: 640 }, { noiseM: 0.8, seed: i + 3 });
    const climb = detectClimbs(track, { minGainM: 200 })[0]!;
    return {
      id: `xalo-${a.monthsAgo}`,
      date: addDays(today, -Math.round(a.monthsAgo * 30.4) - (a.monthsAgo ? 0 : 2)),
      label: a.monthsAgo ? `Hace ${a.monthsAgo} meses` : "Último",
      monthsAgo: a.monthsAgo,
      track: track.slice(climb.startIdx, climb.endIdx + 1),
      climb,
      temperatureC: a.temperatureC,
      sleepH: a.sleepH,
      form: a.form,
    };
  });
}

/** Carga excéntrica semanal de ejemplo (últimas 5 semanas, la última es la actual). */
export const sampleEccentricWeeks = [
  { weekStart: -28, load: 1480 },
  { weekStart: -21, load: 1620 },
  { weekStart: -14, load: 1550 },
  { weekStart: -7, load: 1210 },
  { weekStart: 0, load: 1790 },
];
