import { describe, expect, it } from "vitest";
import { checkWeeklyEccentric, eccentricLoad, slopeFactor } from "./eccentric";
import { syntheticTrack } from "./synthetic";

describe("slopeFactor", () => {
  it("pesa más las pendientes fuertes", () => {
    expect(slopeFactor(5)).toBe(1);
    expect(slopeFactor(-12)).toBe(1.25);
    expect(slopeFactor(15)).toBe(1.5);
    expect(slopeFactor(30)).toBe(2);
  });
});

describe("eccentricLoad", () => {
  it("una subida pura no genera carga excéntrica", () => {
    const pts = syntheticTrack([{ distanceM: 2000, gradePct: 10, speedMs: 1.5, hr: 160 }]);
    expect(eccentricLoad(pts)).toEqual({ descentM: 0, load: 0 });
  });

  it("bajada al 8 % cuenta con factor 1", () => {
    const pts = syntheticTrack([{ distanceM: 2500, gradePct: -8, speedMs: 3, hr: 140 }]);
    const r = eccentricLoad(pts);
    expect(Math.abs(r.descentM - 200)).toBeLessThan(2);
    expect(r.load).toBe(r.descentM);
  });

  it("la misma bajada al 20 % pesa 1,5×", () => {
    const pts = syntheticTrack([{ distanceM: 1000, gradePct: -20, speedMs: 2, hr: 140 }]);
    const r = eccentricLoad(pts);
    expect(Math.abs(r.descentM - 200)).toBeLessThan(2);
    expect(r.load).toBeCloseTo(r.descentM * 1.5, 5);
  });

  it("sube y baja: solo cuenta la bajada", () => {
    const pts = syntheticTrack([
      { distanceM: 3600, gradePct: 10, speedMs: 1.4, hr: 165 },
      { distanceM: 1800, gradePct: -20, speedMs: 2.5, hr: 140 },
    ]);
    const r = eccentricLoad(pts);
    expect(r.descentM).toBeGreaterThan(350);
    expect(r.descentM).toBeLessThan(365);
    expect(r.load).toBeCloseTo(r.descentM * 1.5, -1);
  });

  it("el ruido de altitud en llano no se convierte en bajada", () => {
    const pts = syntheticTrack([{ distanceM: 5000, gradePct: 0, speedMs: 3, hr: 140 }], undefined, { noiseM: 1.5 });
    expect(eccentricLoad(pts).descentM).toBeLessThan(15);
  });

  it("tracks vacíos o de un punto", () => {
    expect(eccentricLoad([])).toEqual({ descentM: 0, load: 0 });
  });
});

describe("checkWeeklyEccentric", () => {
  it("avisa si supera la media de 4 semanas en más de 12,5 %", () => {
    const r = checkWeeklyEccentric(1200, [900, 1000, 1000, 1100]);
    expect(r.avg4w).toBe(1000);
    expect(r.change).toBeCloseTo(0.2);
    expect(r.warn).toBe(true);
  });

  it("no avisa dentro del margen", () => {
    expect(checkWeeklyEccentric(1100, [1000, 1000, 1000, 1000]).warn).toBe(false);
  });

  it("umbral configurable y usa solo las últimas 4", () => {
    const r = checkWeeklyEccentric(1080, [5000, 1000, 1000, 1000, 1000], 0.05);
    expect(r.avg4w).toBe(1000);
    expect(r.warn).toBe(true);
  });

  it("sin historial no avisa", () => {
    expect(checkWeeklyEccentric(800, []).warn).toBe(false);
  });
});
