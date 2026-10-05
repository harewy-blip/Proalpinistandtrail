import { addDays } from "./week";

export interface SampleWellnessDay {
  date: string;
  sleepH: number;
  restingHr: number;
  soreness: number;
  /** Fitness (CTL), fatiga (ATL) y forma = CTL − ATL. */
  ctl: number;
  atl: number;
}

/** Últimos 14 días de wellness terminando en `today`. Deterministas. */
export function sampleWellness(today: string): SampleWellnessDay[] {
  const sleep = [7.4, 6.9, 7.8, 7.1, 6.4, 8.2, 7.6, 7.2, 7.0, 7.9, 6.8, 7.5, 8.0, 7.3];
  const rhr = [45, 46, 44, 45, 47, 44, 45, 46, 45, 44, 46, 47, 45, 46];
  const sore = [2, 3, 1, 2, 4, 5, 3, 2, 3, 1, 2, 3, 4, 2];
  return sleep.map((s, i) => {
    const ctl = 48 + i * 0.35;
    const atl = 52 + Math.sin(i / 2) * 7;
    return {
      date: addDays(today, i - 13),
      sleepH: s,
      restingHr: rhr[i]!,
      soreness: sore[i]!,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
    };
  });
}
