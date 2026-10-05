import type { Metadata } from "next";
import { GhostPanel } from "@/components/GhostPanel";
import { formatClock, formatShortDate, formatSigned } from "@/lib/format";
import { todayIn } from "@/lib/today";
import { getVersionsView } from "@/lib/versions";

export const metadata: Metadata = { title: "Versiones de mí" };
export const dynamic = "force-dynamic";

export default function VersionsPage() {
  const v = getVersionsView(todayIn());
  const older = [...v.efforts.slice(1)].reverse();

  return (
    <main className="page">
      <header className="page-head">
        <div className="stack">
          <h1>Versiones de mí</h1>
          <p className="sub">
            {v.segment.name}: ~{v.segment.gainM} m continuos a FC fija. Detectada automáticamente por GPS en tus actividades.
          </p>
        </div>
      </header>

      <section className="card" aria-labelledby="latest-title">
        <div className="card-head">
          <h2 id="latest-title">Último intento · {formatShortDate(v.latest.date)}</h2>
          {v.records.bestTime.id === v.latest.id && <span className="chip key">Mejor marca</span>}
        </div>
        <div className="stats">
          <div className="stat">
            <span className="label">Tiempo</span>
            <span className="big num">{formatClock(v.latest.durationS)}</span>
          </div>
          <div className="stat">
            <span className="label">VAM</span>
            <span className="big num">{v.latest.vam}</span>
            <span className="faint">m/h</span>
          </div>
          <div className="stat">
            <span className="label">FC media</span>
            <span className="big num">{v.latest.avgHr ?? "—"}</span>
            <span className="faint">ppm</span>
          </div>
        </div>
      </section>

      <section className="grid grid-2" aria-label="Comparaciones">
        {v.comparisons.map((c) => (
          <div key={c.against.id} className="card">
            <h2>Frente a hace {c.against.monthsAgo} meses</h2>
            <div className="stats">
              <div className="stat">
                <span className="label">Tiempo</span>
                <span className="big num">{c.deltaS <= 0 ? "−" : "+"}{formatClock(Math.abs(c.deltaS))}</span>
              </div>
              <div className="stat">
                <span className="label">VAM</span>
                <span className="big num">{formatSigned(c.deltaVam)}</span>
                <span className="faint">m/h</span>
              </div>
              <div className="stat">
                <span className="label">FC media</span>
                <span className="big num">{c.deltaHr == null ? "—" : formatSigned(c.deltaHr)}</span>
                <span className="faint">ppm</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <GhostPanel older={older} ghosts={v.ghosts} />

      <section className="card" aria-labelledby="hist-title">
        <h2 id="hist-title">Historial con condiciones</h2>
        <div className="scroll-x">
          <table className="data">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tiempo</th>
                <th>VAM</th>
                <th>FC media</th>
                <th>D+</th>
                <th>Temp.</th>
                <th>Sueño</th>
                <th>Forma</th>
              </tr>
            </thead>
            <tbody>
              {v.efforts.map((e) => (
                <tr key={e.id} className={e.id === v.latest.id ? "sel" : undefined}>
                  <td>{formatShortDate(e.date)}</td>
                  <td>{formatClock(e.durationS)}</td>
                  <td>{e.vam} m/h</td>
                  <td>{e.avgHr ?? "—"} ppm</td>
                  <td>{e.gainM} m</td>
                  <td>{e.temperatureC} °C</td>
                  <td>{e.sleepH.toFixed(1)} h</td>
                  <td>{formatSigned(e.form)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="faint">Cada resultado guarda sus condiciones para comparar solo lo comparable. Datos de ejemplo.</p>
      </section>
    </main>
  );
}
