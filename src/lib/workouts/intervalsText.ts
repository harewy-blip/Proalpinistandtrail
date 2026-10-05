import type { Repeat, Step, StructuredWorkout, Target } from "./types";

/**
 * Convierte un entrenamiento estructurado al texto del Workout Builder de
 * intervals.icu. Ese texto va en el campo `description` del evento:
 * intervals.icu lo interpreta en pasos, calcula carga y tiempo por zonas y lo
 * envía al reloj (COROS, Garmin) si la sincronización de entrenamientos
 * planificados está activada. Si se envía `workout_doc` en su lugar, se
 * guarda tal cual sin interpretar, y los objetivos de FC no llegan bien.
 *
 * Sintaxis usada:
 *   - 10m Z2 HR            paso de 10 minutos en Z2 de FC
 *   - 2km Z1 HR            por distancia ("m" son minutos; metros es "mtr")
 *   - Subida 10m Z3 HR     el texto previo a la duración es la indicación
 *   - Press lap 10m Z1 HR  termina al pulsar vuelta
 *   Main Set 3x            cabecera con repeticiones; bloque hasta línea vacía
 *
 * intervals.icu no admite repeticiones anidadas: el modelo tampoco.
 */
export function toIntervalsText(w: StructuredWorkout): string {
  const blocks: string[] = [];
  for (const section of w.sections) {
    let pending: string[] = [];
    let headerUsed = false;
    const flush = (header?: string) => {
      if (!pending.length) return;
      blocks.push([header ?? (headerUsed ? undefined : section.title), ...pending].filter(Boolean).join("\n"));
      headerUsed = true;
      pending = [];
    };
    for (const item of section.items) {
      if (item.kind === "step") {
        pending.push(stepLine(item));
      } else {
        flush();
        blocks.push(repeatBlock(item, headerUsed ? undefined : section.title));
        headerUsed = true;
      }
    }
    flush();
  }
  return blocks.join("\n\n");
}

function repeatBlock(r: Repeat, title: string | undefined): string {
  const header = title ? `${title} ${r.times}x` : `${r.times}x`;
  return [header, ...r.steps.map(stepLine)].join("\n");
}

export function stepLine(s: Step): string {
  const parts = ["-"];
  if (s.lapButton) parts.push("Press lap");
  if (s.label) parts.push(sanitizeCue(s.label));
  if (s.durationS) parts.push(formatDurationToken(s.durationS));
  else if (s.distanceM) parts.push(formatDistanceToken(s.distanceM));
  if (s.target) parts.push(targetToken(s.target));
  return parts.join(" ");
}

export function formatDurationToken(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = Math.round(totalS % 60);
  return `${h ? `${h}h` : ""}${m ? `${m}m` : ""}${s ? `${s}s` : ""}` || "0s";
}

export function formatDistanceToken(m: number): string {
  return m >= 1000 && m % 100 === 0 ? `${m / 1000}km` : `${Math.round(m)}mtr`;
}

function targetToken(t: Target): string {
  switch (t.kind) {
    case "hrZone":
      return `${t.zone} HR`;
    case "hrZoneRange":
      return `${t.from}-${t.to} HR`;
    case "lthrPct":
      return t.min === t.max ? `${t.min}% LTHR` : `${t.min}-${t.max}% LTHR`;
  }
}

/**
 * La indicación no debe parecer una duración, objetivo o repetición, o el
 * parser de intervals.icu la interpretaría. Se quitan dígitos y signos.
 */
function sanitizeCue(label: string): string {
  return label.replace(/[\d%\-]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Texto final del evento: premisas como notas (líneas sin "-" que el parser
 * trata como comentario) seguidas de los pasos. Un "4x" en una nota abriría
 * un bloque de repeticiones, así que se escribe con el signo ×.
 */
export function toIntervalsDescription(w: StructuredWorkout): string {
  const steps = toIntervalsText(w);
  const notes = [w.physiologicalGoal, ...w.premises].filter(Boolean).map((n) => n.replace(/^[-\s]+/, "").replace(/(\d+)\s*x\b/gi, "$1×"))
    .filter(Boolean);
  return [notes.join("\n"), steps].filter(Boolean).join("\n\n");
}
