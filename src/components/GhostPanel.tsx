"use client";

import { useState } from "react";
import type { GhostSample } from "@/lib/calc/ghost";
import { formatClock } from "@/lib/format";
import type { EffortRow } from "@/lib/versions";
import { GhostChart } from "./GhostChart";

export function GhostPanel({ older, ghosts }: { older: EffortRow[]; ghosts: Record<string, GhostSample[]> }) {
  const [sel, setSel] = useState(older[older.length - 1]!.id);
  const against = older.find((o) => o.id === sel)!;
  const samples = ghosts[sel] ?? [];
  const end = samples[samples.length - 1];
  return (
    <section className="card" aria-labelledby="ghost-title">
      <div className="card-head" style={{ flexWrap: "wrap" }}>
        <h2 id="ghost-title">Fantasma</h2>
        <div className="seg" role="group" aria-label="Comparar con">
          {older.map((o) => (
            <button key={o.id} type="button" aria-pressed={o.id === sel} onClick={() => setSel(o.id)}>
              {o.monthsAgo} m
            </button>
          ))}
        </div>
      </div>
      {end && (
        <p className="muted">
          A los {Math.round(end.x)} m de desnivel vas{" "}
          <strong style={{ color: "var(--text)" }}>
            {formatClock(Math.abs(end.deltaS))} {end.deltaS <= 0 ? "por delante" : "por detrás"}
          </strong>{" "}
          de tu versión de hace {against.monthsAgo} meses.
        </p>
      )}
      <GhostChart samples={samples} ghostLabel={`Hace ${against.monthsAgo} meses`} />
    </section>
  );
}
