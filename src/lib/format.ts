const DAY_FMT = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const SHORT_FMT = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const WD_FMT = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });

const at = (d: string) => new Date(`${d}T12:00:00Z`);

export const formatLongDate = (d: string) => capitalize(DAY_FMT.format(at(d)));
export const formatShortDate = (d: string) => SHORT_FMT.format(at(d));
export const formatWeekday = (d: string) => capitalize(WD_FMT.format(at(d)).replace(".", ""));

/** 1888 → "31:28"; 4210 → "1:10:10" */
export function formatClock(totalS: number): string {
  const s = Math.round(Math.abs(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${totalS < 0 ? "−" : ""}${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function formatSigned(n: number, unit = ""): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r)}${unit}`;
}

export function formatZoneRange(z: { min: number; max: number | null }): string {
  if (z.min === 0 && z.max !== null) return `< ${z.max + 1} ppm`;
  return z.max === null ? `≥ ${z.min} ppm` : `${z.min}–${z.max} ppm`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
