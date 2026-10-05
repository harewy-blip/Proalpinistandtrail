"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GhostSample } from "@/lib/calc/ghost";
import { formatClock } from "@/lib/format";

/**
 * Dos gráficas sobre el mismo eje X (metros de desnivel ganados), cada una con
 * su única escala Y: ventaja/retraso frente al fantasma y FC de ambos
 * intentos. Cruz y tooltip compartidos al pasar el dedo o el ratón.
 */
const PAD = { l: 44, r: 12, t: 10, b: 26 };

function scale(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

function path(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
}

export function GhostChart({ samples, ghostLabel }: { samples: GhostSample[]; ghostLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // El viewBox sigue al ancho real para que el texto de los ejes no escale.
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const maxX = samples[samples.length - 1]?.x ?? 0;
  const x = scale(0, maxX, PAD.l, W - PAD.r);

  const delta = useMemo(() => {
    const H = 170;
    const vals = samples.map((s) => s.deltaS);
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const pad = (hi - lo) * 0.08 || 10;
    const y = scale(lo - pad, hi + pad, H - PAD.b, PAD.t);
    return { H, y, ticks: niceTicks(lo - pad, hi + pad), d: path(samples.map((s) => [x(s.x), y(s.deltaS)])) };
  }, [samples, x]);

  const hr = useMemo(() => {
    const H = 170;
    const vals = samples.flatMap((s) => [s.current.hr, s.ghost.hr]).filter((v): v is number => v != null);
    const lo = Math.min(...vals) - 4;
    const hi = Math.max(...vals) + 4;
    const y = scale(lo, hi, H - PAD.b, PAD.t);
    const line = (pick: (s: GhostSample) => number | null) =>
      path(samples.filter((s) => pick(s) != null).map((s) => [x(s.x), y(pick(s)!)]));
    return { H, y, ticks: niceTicks(lo, hi), current: line((s) => s.current.hr), ghost: line((s) => s.ghost.hr) };
  }, [samples, x]);

  const xTicks = niceTicks(0, maxX, W < 420 ? 3 : 5);
  const h = hover != null ? samples[hover] : undefined;

  const onMove = (e: React.PointerEvent) => {
    const svg = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - svg.left) / svg.width) * W;
    const xv = ((px - PAD.l) / (W - PAD.l - PAD.r)) * maxX;
    let best = 0;
    for (let i = 1; i < samples.length; i++) if (Math.abs(samples[i]!.x - xv) < Math.abs(samples[best]!.x - xv)) best = i;
    setHover(best);
  };

  const axisX = (H: number) =>
    xTicks.map((t) => (
      <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-3)">
        {t} m
      </text>
    ));

  const crosshair = (H: number) =>
    h ? <line x1={x(h.x)} x2={x(h.x)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-3)" strokeWidth="1" strokeDasharray="3 3" /> : null;

  const handlers = { onPointerMove: onMove, onPointerDown: onMove, onPointerLeave: () => setHover(null) };

  return (
    <div className="stack" ref={wrap}>
      <div className="chart">
        <span className="faint">Ventaja frente a {ghostLabel.toLowerCase()} (segundos; abajo = por delante)</span>
        <svg viewBox={`0 0 ${W} ${delta.H}`} role="img" aria-label="Diferencia de tiempo frente al intento anterior por metros de desnivel" {...handlers} style={{ touchAction: "pan-y" }}>
          {delta.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={delta.y(t)} y2={delta.y(t)} stroke={t === 0 ? "var(--text-3)" : "var(--grid)"} strokeWidth="1" />
              <text x={PAD.l - 6} y={delta.y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)">
                {t > 0 ? `+${t}` : t}
              </text>
            </g>
          ))}
          {axisX(delta.H)}
          <path d={delta.d} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />
          {crosshair(delta.H)}
          {h && <circle cx={x(h.x)} cy={delta.y(h.deltaS)} r="4.5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />}
        </svg>
      </div>

      <div className="chart">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="faint">Frecuencia cardiaca (ppm)</span>
          <div className="legend">
            <span>
              <i style={{ background: "var(--series-1)" }} />
              Último
            </span>
            <span>
              <i style={{ background: "var(--series-2)" }} />
              {ghostLabel}
            </span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${hr.H}`} role="img" aria-label="Frecuencia cardiaca de ambos intentos por metros de desnivel" {...handlers} style={{ touchAction: "pan-y" }}>
          {hr.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={hr.y(t)} y2={hr.y(t)} stroke="var(--grid)" strokeWidth="1" />
              <text x={PAD.l - 6} y={hr.y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)">
                {t}
              </text>
            </g>
          ))}
          {axisX(hr.H)}
          <path d={hr.ghost} fill="none" stroke="var(--series-2)" strokeWidth="2" strokeLinejoin="round" />
          <path d={hr.current} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" />
          {crosshair(hr.H)}
          {h?.ghost.hr != null && <circle cx={x(h.x)} cy={hr.y(h.ghost.hr)} r="4.5" fill="var(--series-2)" stroke="var(--surface)" strokeWidth="2" />}
          {h?.current.hr != null && <circle cx={x(h.x)} cy={hr.y(h.current.hr)} r="4.5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />}
        </svg>
        {h && (
          <div className="tip" style={{ left: `${(x(h.x) / W) * 100}%`, top: 0 }}>
            <strong className="num">{Math.round(h.x)} m de desnivel</strong>
            <div className="num">
              Último {formatClock(h.current.t)} · {h.current.hr ?? "—"} ppm
            </div>
            <div className="num muted">
              {ghostLabel} {formatClock(h.ghost.t)} · {h.ghost.hr ?? "—"} ppm
            </div>
            <div className="num" style={{ fontWeight: 600 }}>
              {h.deltaS <= 0 ? `${formatClock(-h.deltaS)} por delante` : `${formatClock(h.deltaS)} por detrás`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
