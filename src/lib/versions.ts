import { alignAttempts, type GhostSample } from "./calc/ghost";
import { sampleXaloEfforts, xaloReference, type SampleEffort } from "./sample/xalo";

export interface EffortRow {
  id: string;
  date: string;
  label: string;
  monthsAgo: number;
  durationS: number;
  gainM: number;
  vam: number;
  avgHr: number | null;
  temperatureC: number;
  sleepH: number;
  form: number;
}

export interface VersionsView {
  segment: typeof xaloReference;
  efforts: EffortRow[];
  latest: EffortRow;
  comparisons: { against: EffortRow; deltaS: number; deltaVam: number; deltaHr: number | null }[];
  records: { bestVam: EffortRow; bestTime: EffortRow };
  ghosts: Record<string, GhostSample[]>;
}

function toRow(e: SampleEffort): EffortRow {
  return {
    id: e.id,
    date: e.date,
    label: e.label,
    monthsAgo: e.monthsAgo,
    durationS: e.climb.durationS,
    gainM: e.climb.gainM,
    vam: e.climb.vam,
    avgHr: e.climb.avgHr,
    temperatureC: e.temperatureC,
    sleepH: e.sleepH,
    form: e.form,
  };
}

/** Datos de la pantalla Versiones de mí: último intento frente a los anteriores. */
export function getVersionsView(today: string): VersionsView {
  const efforts = sampleXaloEfforts(today).sort((a, b) => b.date.localeCompare(a.date));
  const rows = efforts.map(toRow);
  const latestEffort = efforts[0]!;
  const latest = rows[0]!;
  const older = rows.slice(1);

  const ghosts: Record<string, GhostSample[]> = {};
  for (const e of efforts.slice(1)) ghosts[e.id] = alignAttempts(latestEffort.track, e.track, "elevation", 5);

  return {
    segment: xaloReference,
    efforts: rows,
    latest,
    comparisons: older.map((o) => ({
      against: o,
      deltaS: latest.durationS - o.durationS,
      deltaVam: latest.vam - o.vam,
      deltaHr: latest.avgHr != null && o.avgHr != null ? latest.avgHr - o.avgHr : null,
    })),
    records: {
      bestVam: rows.reduce((a, b) => (b.vam > a.vam ? b : a)),
      bestTime: rows.reduce((a, b) => (b.durationS < a.durationS ? b : a)),
    },
    ghosts,
  };
}
