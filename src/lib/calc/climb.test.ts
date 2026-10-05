import { describe, expect, it } from "vitest";
import { detectClimbs, matchSegment, type ReferenceSegment } from "./climb";
import { syntheticTrack } from "./synthetic";

// Subida tipo Xalo: ~360 m de desnivel con 4 km al 9 %.
const warmup = { distanceM: 1500, gradePct: 0, speedMs: 2.8, hr: 135 };
const xalo = { distanceM: 4000, gradePct: 9, speedMs: 2.2, hr: 168 };
const descent = { distanceM: 2500, gradePct: -14.4, speedMs: 3, hr: 140 };

describe("detectClimbs", () => {
  it("detecta la subida continua con su desnivel, VAM y FC", () => {
    const pts = syntheticTrack([warmup, xalo, descent], undefined, { noiseM: 1, seed: 7 });
    const climbs = detectClimbs(pts);
    expect(climbs).toHaveLength(1);
    const c = climbs[0]!;
    expect(c.gainM).toBeGreaterThan(350);
    expect(c.gainM).toBeLessThan(370);
    expect(c.durationS).toBeGreaterThan(1750);
    expect(c.durationS).toBeLessThan(1880);
    // 360 m en ~1818 s → ~713 m/h
    expect(c.vam).toBeGreaterThan(690);
    expect(c.vam).toBeLessThan(740);
    expect(c.avgHr).toBeGreaterThanOrEqual(166);
  });

  it("un rellano corto no rompe la subida", () => {
    const pts = syntheticTrack([
      { distanceM: 2000, gradePct: 9, speedMs: 2.2, hr: 165 },
      { distanceM: 100, gradePct: -5, speedMs: 3, hr: 160 },
      { distanceM: 2000, gradePct: 9, speedMs: 2.2, hr: 168 },
    ]);
    const climbs = detectClimbs(pts);
    expect(climbs).toHaveLength(1);
    expect(climbs[0]!.gainM).toBeGreaterThan(350);
  });

  it("una bajada larga separa dos subidas", () => {
    const pts = syntheticTrack([
      { distanceM: 2000, gradePct: 10, speedMs: 2, hr: 165 },
      { distanceM: 1000, gradePct: -10, speedMs: 3, hr: 140 },
      { distanceM: 1500, gradePct: 10, speedMs: 2, hr: 165 },
    ]);
    const climbs = detectClimbs(pts);
    const gains = climbs.map((c) => c.gainM);
    expect(gains).toHaveLength(2);
    expect(Math.abs(gains[0]! - 200)).toBeLessThanOrEqual(3);
    expect(Math.abs(gains[1]! - 150)).toBeLessThanOrEqual(3);
  });

  it("ignora repechos por debajo del mínimo", () => {
    const pts = syntheticTrack([{ distanceM: 500, gradePct: 8, speedMs: 2.5, hr: 150 }]);
    expect(detectClimbs(pts)).toEqual([]);
  });
});

describe("matchSegment", () => {
  const pts = syntheticTrack([warmup, xalo, descent]);
  const startPt = pts.find((p) => p.dist >= warmup.distanceM)!;
  const endPt = pts.find((p) => p.dist >= warmup.distanceM + xalo.distanceM)!;
  const ref: ReferenceSegment = {
    id: "xalo",
    name: "Subida al Xalo",
    start: { lat: startPt.lat!, lng: startPt.lng! },
    end: { lat: endPt.lat!, lng: endPt.lng! },
    distanceM: 4000,
    gainM: 360,
  };

  it("encuentra el paso por el segmento de referencia", () => {
    const m = matchSegment(pts, ref);
    expect(m).toHaveLength(1);
    expect(m[0]!.distanceM).toBeGreaterThan(3950);
    expect(m[0]!.distanceM).toBeLessThan(4050);
    expect(m[0]!.gainM).toBeGreaterThan(350);
  });

  it("no encuentra nada en otra zona", () => {
    const elsewhere = syntheticTrack([xalo], { lat: 42, lng: 1, alt: 800 });
    expect(matchSegment(elsewhere, ref)).toEqual([]);
  });

  it("rechaza si la distancia no cuadra (otro camino entre los mismos puntos)", () => {
    expect(matchSegment(pts, { ...ref, distanceM: 2000 })).toEqual([]);
  });

  it("puntos sin GPS no rompen", () => {
    const noGps = pts.map(({ lat: _lat, lng: _lng, ...p }) => p);
    expect(matchSegment(noGps, ref)).toEqual([]);
  });
});
