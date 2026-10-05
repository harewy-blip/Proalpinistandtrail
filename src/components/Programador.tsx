"use client";

import { useEffect, useMemo, useState } from "react";
import { dayCarbs, type SessionType } from "@/lib/calc/nutrition";
import { checkWeekRules } from "@/lib/calc/weekRules";
import type { HrZone } from "@/lib/calc/zones";
import { formatWeekday } from "@/lib/format";
import { toSessionInputs } from "@/lib/today";
import { formatDuration, workoutSeconds } from "@/lib/workouts/duration";
import { toIntervalsDescription } from "@/lib/workouts/intervalsText";
import { TEMPLATE_LABELS, WORKOUT_TEMPLATES } from "@/lib/workouts/templates";
import type { IntervalsSport, Repeat, Step, StructuredWorkout, Target } from "@/lib/workouts/types";
import { WorkoutSteps } from "./WorkoutSteps";

const TYPES: [SessionType, string][] = [
  ["quality", "Calidad"],
  ["mountain", "Montaña"],
  ["long", "Larga"],
  ["aerobic", "Aeróbico"],
  ["bike", "Bici"],
  ["strength", "Fuerza"],
  ["climbing", "Escalada"],
  ["rest", "Descanso"],
  ["race", "Carrera"],
];
const SPORTS: [IntervalsSport, string][] = [
  ["TrailRun", "Trail"],
  ["Run", "Carrera"],
  ["Hike", "Montaña a pie"],
  ["Ride", "Bici"],
  ["WeightTraining", "Fuerza"],
  ["RockClimbing", "Escalada"],
];
const TARGETS: [string, string][] = [
  ["", "Sin objetivo"],
  ["Z1", "Z1"],
  ["Z2", "Z2"],
  ["Z3", "Z3"],
  ["Z4", "Z4"],
  ["Z5", "Z5"],
  ["Z1-Z2", "Z1–Z2"],
  ["86-89", "86–89 % LTHR"],
];

function targetKey(t?: Target): string {
  if (!t) return "";
  if (t.kind === "hrZone") return t.zone;
  if (t.kind === "hrZoneRange") return `${t.from}-${t.to}`;
  return `${t.min}-${t.max}`;
}
function keyToTarget(k: string): Target | undefined {
  if (!k) return undefined;
  if (/^Z\d$/.test(k)) return { kind: "hrZone", zone: k as "Z1" };
  if (/^Z\d-Z\d$/.test(k)) {
    const [from, to] = k.split("-") as ["Z1", "Z2"];
    return { kind: "hrZoneRange", from, to };
  }
  const [min, max] = k.split("-").map(Number);
  return { kind: "lthrPct", min: min!, max: max! };
}

const clone = <T,>(x: T): T => structuredClone(x);

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "demo"; description: string }
  | { kind: "live"; id: number }
  | { kind: "error"; message: string };

export function Programador({
  today,
  week,
  zones,
  weightKg,
}: {
  today: string;
  week: StructuredWorkout[];
  zones: HrZone[];
  weightKg: number;
}) {
  const [plan, setPlan] = useState(week);
  const initial = Math.max(0, week.findIndex((w) => w.date > today));
  const [dayIdx, setDayIdx] = useState(initial);
  const w = plan[dayIdx]!;
  const [status, setStatus] = useState<{ configured: boolean; passcodeRequired: boolean } | null>(null);
  const [passcode, setPasscode] = useState("");
  const [send, setSend] = useState<SendState>({ kind: "idle" });

  useEffect(() => {
    fetch("/api/intervals/events")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    try {
      setPasscode(localStorage.getItem("app-passcode") ?? "");
    } catch {}
  }, []);

  const update = (fn: (draft: StructuredWorkout) => void) => {
    setPlan((p) => p.map((x, i) => (i === dayIdx ? (() => { const d = clone(x); fn(d); return d; })() : x)));
    setSend({ kind: "idle" });
  };

  const applyTemplate = (key: string) => {
    const t = WORKOUT_TEMPLATES[key];
    if (t) update((d) => Object.assign(d, clone(t), { date: d.date }));
  };

  const description = useMemo(() => toIntervalsDescription(w), [w]);
  const violations = useMemo(() => checkWeekRules(plan), [plan]);
  const carbs = useMemo(
    () => dayCarbs({ weightKg, today: toSessionInputs(w), tomorrow: toSessionInputs(plan[dayIdx + 1]) }),
    [w, plan, dayIdx, weightKg],
  );

  async function submit() {
    setSend({ kind: "sending" });
    try {
      localStorage.setItem("app-passcode", passcode);
    } catch {}
    try {
      const res = await fetch("/api/intervals/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-passcode": passcode },
        body: JSON.stringify({ workout: w }),
      });
      const body = await res.json();
      if (!res.ok) setSend({ kind: "error", message: [body.error, ...(body.errors ?? [])].join(" · ") });
      else if (body.mode === "demo") setSend({ kind: "demo", description: body.event.description ?? "" });
      else setSend({ kind: "live", id: body.event.id });
    } catch {
      setSend({ kind: "error", message: "Sin conexión con el servidor" });
    }
  }

  return (
    <>
      <section className="card" aria-label="Día">
        <div className="week">
          {plan.map((d, i) => (
            <button
              key={d.date}
              type="button"
              className={`day${i === dayIdx ? " today" : ""}${d.isKey ? " key" : ""}`}
              onClick={() => {
                setDayIdx(i);
                setSend({ kind: "idle" });
              }}
              aria-pressed={i === dayIdx}
            >
              <span>
                {formatWeekday(d.date)} {Number(d.date.slice(8))}
              </span>
              <strong>{SHORT_LABEL[d.type]}</strong>
              <span className="num">{d.type === "rest" ? "—" : formatDuration(workoutSeconds(d))}</span>
            </button>
          ))}
        </div>
        {violations.map((v) => (
          <p key={v.ruleId + v.dates.join()} className="warn">
            <strong>{v.message}.</strong> Regla: {v.rule}.
          </p>
        ))}
      </section>

      <div className="grid grid-main">
        <section className="card" aria-label="Editor">
          <div className="card-head">
            <h2>Sesión</h2>
            <select aria-label="Plantilla" value="" onChange={(e) => applyTemplate(e.target.value)} style={{ width: "auto" }}>
              <option value="">Usar plantilla…</option>
              {Object.entries(TEMPLATE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-grid">
            <label style={{ gridColumn: "1 / -1" }}>
              Nombre
              <input value={w.name} onChange={(e) => update((d) => void (d.name = e.target.value))} />
            </label>
            <label>
              Tipo
              <select value={w.type} onChange={(e) => update((d) => void (d.type = e.target.value as SessionType))}>
                {TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Deporte en intervals.icu
              <select value={w.sport} onChange={(e) => update((d) => void (d.sport = e.target.value as IntervalsSport))}>
                {SPORTS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Objetivo fisiológico
              <input value={w.physiologicalGoal} onChange={(e) => update((d) => void (d.physiologicalGoal = e.target.value))} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Premisas (una por línea)
              <textarea
                value={w.premises.join("\n")}
                onChange={(e) => update((d) => void (d.premises = e.target.value.split("\n")))}
              />
            </label>
            <label className="row" style={{ display: "flex", gridColumn: "1 / -1" }}>
              <input type="checkbox" checked={w.isKey} onChange={(e) => update((d) => void (d.isKey = e.target.checked))} style={{ width: 20, minHeight: 20 }} />
              Sesión clave (cuenta para la adherencia)
            </label>
          </div>

          {w.sections.length === 0 && w.type !== "rest" && (
            <label>
              Duración planificada (min)
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={Math.round((w.plannedDurationS ?? 0) / 60)}
                onChange={(e) => update((d) => void (d.plannedDurationS = Math.max(0, Number(e.target.value)) * 60))}
              />
            </label>
          )}

          {w.sections.map((sec, si) => (
            <div key={si} className="stack">
              <div className="card-head">
                <span className="faint">{SECTION_LABEL[sec.title] ?? sec.title}</span>
                <button type="button" className="ghost" onClick={() => update((d) => void d.sections.splice(si, 1))}>
                  Quitar sección
                </button>
              </div>
              {sec.items.map((item, ii) =>
                item.kind === "step" ? (
                  <StepEditor
                    key={ii}
                    step={item}
                    onChange={(s) => update((d) => void (d.sections[si]!.items[ii] = s))}
                    onRemove={() => update((d) => void d.sections[si]!.items.splice(ii, 1))}
                  />
                ) : (
                  <RepeatEditor
                    key={ii}
                    rep={item}
                    onChange={(r) => update((d) => void (d.sections[si]!.items[ii] = r))}
                    onRemove={() => update((d) => void d.sections[si]!.items.splice(ii, 1))}
                  />
                ),
              )}
              <div className="row">
                <button type="button" onClick={() => update((d) => void d.sections[si]!.items.push(newStep()))}>
                  + Paso
                </button>
                <button
                  type="button"
                  onClick={() => update((d) => void d.sections[si]!.items.push({ kind: "repeat", times: 3, steps: [newStep(), newStep(5, "Z1")] }))}
                >
                  + Repetición
                </button>
              </div>
            </div>
          ))}
          <div className="row">
            {(["Warmup", "Main Set", "Cooldown"] as const)
              .filter((t) => !w.sections.some((s) => s.title === t))
              .map((t) => (
                <button key={t} type="button" className="ghost" onClick={() => update((d) => void d.sections.push({ title: t, items: [newStep()] }))}>
                  + {SECTION_LABEL[t]}
                </button>
              ))}
          </div>
        </section>

        <div className="grid">
          <section className="card" aria-label="Resumen">
            <div className="card-head">
              <h2>Resumen</h2>
              {w.isKey && <span className="chip key">Clave</span>}
            </div>
            <div className="stats">
              <div className="stat">
                <span className="label">Duración</span>
                <span className="big num">{w.type === "rest" ? "—" : formatDuration(workoutSeconds(w))}</span>
              </div>
              <div className="stat">
                <span className="label">CHO del día</span>
                <span className="big num">{carbs.carbsTargetG} g</span>
                <span className="faint">
                  {carbs.carbsGPerKg.min}–{carbs.carbsGPerKg.max} g/kg
                </span>
              </div>
            </div>
            {w.sections.length > 0 && <WorkoutSteps sections={w.sections} zones={zones} />}
          </section>

          <section className="card" aria-label="Enviar">
            <div className="card-head">
              <h2>intervals.icu → COROS</h2>
              <span className="chip">{status?.configured ? "Conectado" : "Modo demo"}</span>
            </div>
            <pre className="code" aria-label="Texto que recibirá intervals.icu">
              {description || "(sin pasos: se enviará como nota con duración)"}
            </pre>
            {status?.passcodeRequired && (
              <label>
                Código de acceso
                <input type="password" autoComplete="current-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
              </label>
            )}
            <button
              type="button"
              className="primary"
              disabled={send.kind === "sending" || w.type === "rest" || (status?.passcodeRequired === true && !passcode)}
              onClick={submit}
            >
              {send.kind === "sending" ? "Enviando…" : `Enviar ${formatWeekday(w.date).toLowerCase()} al calendario`}
            </button>
            {send.kind === "demo" && (
              <p className="note">
                Modo demo: no hay credenciales de intervals.icu en el servidor. Este es el evento que se crearía; con
                INTERVALS_ATHLETE_ID e INTERVALS_API_KEY configuradas llegará al calendario y de ahí al reloj.
              </p>
            )}
            {send.kind === "live" && <p className="note">Creado en intervals.icu (evento {send.id}). Se sincronizará con el reloj.</p>}
            {send.kind === "error" && (
              <p className="warn" role="alert">
                {send.message}
              </p>
            )}
            <p className="faint">
              Para que llegue al reloj: intervals.icu → Settings → Connections → COROS → activar la subida de entrenamientos planificados.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

function newStep(minutes = 10, zone: "Z1" | "Z2" = "Z2"): Step {
  return { kind: "step", durationS: minutes * 60, target: { kind: "hrZone", zone } };
}

function StepEditor({ step, onChange, onRemove }: { step: Step; onChange: (s: Step) => void; onRemove: () => void }) {
  const set = (patch: Partial<Step>) => {
    const next: Step = { ...step, ...patch };
    if (!next.target) delete next.target;
    if (!next.label) delete next.label;
    onChange(next);
  };
  return (
    <div className="row" style={{ flexWrap: "nowrap" }}>
      <input
        aria-label="Indicación"
        placeholder="Indicación"
        value={step.label ?? ""}
        onChange={(e) => set({ label: e.target.value })}
        style={{ flex: 2 }}
      />
      <input
        aria-label="Minutos"
        type="number"
        min={1}
        inputMode="numeric"
        value={Math.round((step.durationS ?? 0) / 60)}
        onChange={(e) => set({ durationS: Math.max(1, Number(e.target.value)) * 60 })}
        style={{ flex: 1, maxWidth: 76 }}
      />
      <select
        aria-label="Objetivo"
        value={targetKey(step.target)}
        onChange={(e) => {
          const t = keyToTarget(e.target.value);
          set(t ? { target: t } : { target: undefined as unknown as Target });
        }}
        style={{ flex: 1.3, maxWidth: 140 }}
      >
        {TARGETS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button type="button" className="ghost" aria-label="Quitar paso" onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

function RepeatEditor({ rep, onChange, onRemove }: { rep: Repeat; onChange: (r: Repeat) => void; onRemove: () => void }) {
  return (
    <div className="stack" style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 10 }}>
      <div className="row">
        <label className="row" style={{ display: "flex" }}>
          Repetir
          <input
            type="number"
            min={1}
            max={50}
            inputMode="numeric"
            value={rep.times}
            onChange={(e) => onChange({ ...rep, times: Math.min(50, Math.max(1, Number(e.target.value))) })}
            style={{ width: 72 }}
          />
          veces
        </label>
        <button type="button" className="ghost" onClick={onRemove} style={{ marginLeft: "auto" }}>
          Quitar
        </button>
      </div>
      {rep.steps.map((s, i) => (
        <StepEditor
          key={i}
          step={s}
          onChange={(ns) => onChange({ ...rep, steps: rep.steps.map((x, j) => (j === i ? ns : x)) })}
          onRemove={() => onChange({ ...rep, steps: rep.steps.filter((_, j) => j !== i) })}
        />
      ))}
      <button type="button" className="ghost" onClick={() => onChange({ ...rep, steps: [...rep.steps, newStep(5, "Z1")] })}>
        + Paso en la repetición
      </button>
    </div>
  );
}

const SHORT_LABEL: Record<SessionType, string> = {
  rest: "Desc.",
  strength: "Fza.",
  climbing: "Escal.",
  aerobic: "Z2",
  bike: "Bici",
  quality: "Cal.",
  mountain: "Mont.",
  long: "Larga",
  race: "Carrera",
};

const SECTION_LABEL: Record<string, string> = {
  Warmup: "Calentamiento",
  "Main Set": "Parte principal",
  Cooldown: "Vuelta a la calma",
};
