import type { Metadata } from "next";
import Link from "next/link";
import { WorkoutSteps } from "@/components/WorkoutSteps";
import { formatLongDate, formatWeekday, formatZoneRange } from "@/lib/format";
import { getTodayView, todayIn } from "@/lib/today";
import { formatDuration, workoutSeconds } from "@/lib/workouts/duration";

export const metadata: Metadata = { title: "Hoy" };
export const dynamic = "force-dynamic";

const LIGHT_LABEL = { green: "Listo", amber: "Con cautela", red: "Mejor suave" } as const;
const TYPE_LABEL: Record<string, string> = {
  rest: "Descanso",
  strength: "Fuerza",
  climbing: "Escalada",
  aerobic: "Aeróbico",
  bike: "Bici",
  quality: "Calidad",
  mountain: "Montaña",
  long: "Larga",
  race: "Carrera",
};

const SHORT_LABEL: Record<string, string> = {
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

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const today = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayIn();
  const v = getTodayView(today);
  const w = v.workout;

  return (
    <main className="page">
      <header className="page-head">
        <div className="stack">
          <h1>{formatLongDate(today)}</h1>
          <p className="sub">Qué toca hoy y si estás en condiciones de hacerlo.</p>
        </div>
        <span className={`status ${v.readiness.light}`}>
          <span className="dot" aria-hidden />
          {LIGHT_LABEL[v.readiness.light]}
        </span>
      </header>

      <section className="card" aria-label="Semana">
        <div className="week">
          {v.week.map((day) => (
            <Link
              key={day.date}
              href={`/?d=${day.date}`}
              className={`day${day.date === today ? " today" : ""}${day.isKey ? " key" : ""}`}
              aria-current={day.date === today ? "date" : undefined}
            >
              <span>{formatWeekday(day.date)}</span>
              <strong>{SHORT_LABEL[day.type]}</strong>
              <span className="num">{day.type === "rest" ? "—" : formatDuration(workoutSeconds(day))}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-main">
        <section className="card" aria-labelledby="session-title">
          <div className="card-head">
            <h2>Sesión de hoy</h2>
            <div className="row">
              {w?.isKey && <span className="chip key">Clave</span>}
              {w && <span className="chip">{TYPE_LABEL[w.type]}</span>}
            </div>
          </div>
          {w ? (
            <>
              <div className="stack">
                <h3 id="session-title">{w.name}</h3>
                <p className="muted">{w.physiologicalGoal}</p>
              </div>
              {v.durationS > 0 && w.type !== "rest" && (
                <div className="stats">
                  <div className="stat">
                    <span className="label">Duración</span>
                    <span className="big num">{formatDuration(v.durationS)}</span>
                  </div>
                  {v.intra && (
                    <div className="stat">
                      <span className="label">Durante</span>
                      <span className="big num">
                        {v.intra.carbsGPerHour.max ? `${v.intra.carbsGPerHour.min}–${v.intra.carbsGPerHour.max}` : "Agua"}
                      </span>
                      {v.intra.carbsGPerHour.max > 0 && <span className="faint">g CHO / hora</span>}
                    </div>
                  )}
                </div>
              )}
              {w.sections.length > 0 && <WorkoutSteps sections={w.sections} zones={v.athlete.zones} />}
              {v.zones.length > 0 && (
                <div className="stack">
                  <span className="faint">Zonas de FC (umbral {v.athlete.lthr} ppm, {v.athlete.lthrMethod === "estimate" ? "estimado" : "test"})</span>
                  <div className="row">
                    {v.zones.map((z) => (
                      <span key={z.zone} className="chip num">
                        {z.zone} · {formatZoneRange(z)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {w.premises.length > 0 && (
                <div className="stack">
                  <span className="faint">Premisas</span>
                  {w.premises.map((p) => (
                    <p key={p} className="note">
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="muted">Sin sesión planificada.</p>
          )}
        </section>

        <div className="grid">
          <section className="card" aria-labelledby="ready-title">
            <div className="card-head">
              <h2 id="ready-title">Disponibilidad</h2>
              <span className={`status ${v.readiness.light}`}>
                <span className="dot" aria-hidden />
                {LIGHT_LABEL[v.readiness.light]}
              </span>
            </div>
            <ul className="list">
              {v.readiness.signals.map((s) => (
                <li key={s.key} title={s.rule}>
                  <span className={`status ${s.light}`}>
                    <span className="dot" aria-hidden />
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{s.label}</span>
                  </span>
                  <span className="num muted">{s.value}</span>
                </li>
              ))}
            </ul>
            <p className="faint">La peor señal decide el semáforo. Mantén pulsada una fila para ver su regla.</p>
          </section>

          <section className="card" aria-labelledby="carbs-title">
            <div className="card-head">
              <h2 id="carbs-title">Carbohidratos del día</h2>
              <span className="chip">{v.nutrition.carbsGPerKg.min}–{v.nutrition.carbsGPerKg.max} g/kg</span>
            </div>
            <div className="stats">
              <div className="stat">
                <span className="label">Objetivo</span>
                <span className="big num">{v.nutrition.carbsTargetG} g</span>
                <span className="faint num">
                  {v.nutrition.carbsG.min}–{v.nutrition.carbsG.max} g · {v.athlete.weightKg} kg
                </span>
              </div>
              <div className="stat">
                <span className="label">Proteína</span>
                <span className="big num">
                  {v.nutrition.proteinG.min === v.nutrition.proteinG.max
                    ? v.nutrition.proteinG.min
                    : `${v.nutrition.proteinG.min}–${v.nutrition.proteinG.max}`}{" "}
                  g
                </span>
              </div>
            </div>
            {v.recovery && (
              <p className="note">
                Recuperación en las 2 h siguientes: {v.recovery.carbsG.min}–{v.recovery.carbsG.max} g de carbohidratos y ~{v.recovery.proteinG} g de proteína.
              </p>
            )}
            <ul className="stack faint" style={{ margin: 0, paddingLeft: 18 }}>
              {v.nutrition.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          <section className="card" aria-labelledby="ecc-title">
            <div className="card-head">
              <h2 id="ecc-title">Carga excéntrica semanal</h2>
            </div>
            <div className="stats">
              <div className="stat">
                <span className="label">Esta semana</span>
                <span className="big num">{Math.round(v.eccentric.thisWeek)}</span>
              </div>
              <div className="stat">
                <span className="label">Media 4 semanas</span>
                <span className="big num muted">{Math.round(v.eccentric.avg4w)}</span>
              </div>
            </div>
            {v.eccentric.warn ? (
              <p className="warn">
                <strong>+{Math.round(v.eccentric.change * 100)} %</strong> sobre tu media de 4 semanas (aviso a partir de +12,5 %). La bajada es tu limitante: suaviza las bajadas de la larga o recorta D−.
              </p>
            ) : (
              <p className="muted">Dentro de tu progresión ({Math.round(v.eccentric.change * 100)} % frente a la media).</p>
            )}
            <p className="faint">Índice propio: metros de bajada × factor de pendiente (×1,5 por encima del 15 %).</p>
          </section>
        </div>
      </div>
      <p className="faint">Datos de ejemplo. Conecta intervals.icu para ver los tuyos.</p>
    </main>
  );
}
