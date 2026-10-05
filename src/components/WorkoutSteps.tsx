import type { HrZone } from "@/lib/calc/zones";
import { formatZoneRange } from "@/lib/format";
import { formatDuration } from "@/lib/workouts/duration";
import type { Section, Step, Target } from "@/lib/workouts/types";

function targetLabel(t: Target | undefined, zones: readonly HrZone[]): { tag: string; title?: string } | null {
  if (!t) return null;
  if (t.kind === "hrZone") {
    const z = zones.find((x) => x.zone === t.zone);
    return { tag: t.zone, ...(z ? { title: formatZoneRange(z) } : {}) };
  }
  if (t.kind === "hrZoneRange") return { tag: `${t.from}–${t.to}` };
  return { tag: `${t.min}–${t.max}% LTHR` };
}

function StepRow({ s, zones }: { s: Step; zones: readonly HrZone[] }) {
  const target = targetLabel(s.target, zones);
  return (
    <li>
      <span className="dur">{s.durationS ? formatDuration(s.durationS) : s.distanceM ? `${s.distanceM / 1000} km` : "—"}</span>
      <span>{s.label ?? (s.lapButton ? "Hasta pulsar vuelta" : "Continuo")}</span>
      {target ? (
        <span className="zone" title={target.title}>
          {target.tag}
        </span>
      ) : (
        <span />
      )}
    </li>
  );
}

export function WorkoutSteps({ sections, zones }: { sections: readonly Section[]; zones: readonly HrZone[] }) {
  return (
    <div className="stack">
      {sections.map((sec, i) => (
        <div key={i} className="stack">
          <span className="faint">{SECTION_LABEL[sec.title] ?? sec.title}</span>
          <ul className="steps">
            {sec.items.map((item, j) =>
              item.kind === "step" ? (
                <StepRow key={j} s={item} zones={zones} />
              ) : (
                <li key={j} className="rep">
                  <strong>{item.times}×</strong>
                  <ul className="steps">
                    {item.steps.map((s, k) => (
                      <StepRow key={k} s={s} zones={zones} />
                    ))}
                  </ul>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

const SECTION_LABEL: Record<string, string> = {
  Warmup: "Calentamiento",
  "Main Set": "Parte principal",
  Cooldown: "Vuelta a la calma",
};
