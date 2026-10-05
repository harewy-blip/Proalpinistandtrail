import { describe, expect, it } from "vitest";
import { alignAttempts } from "./ghost";
import { syntheticTrack } from "./synthetic";

const fast = syntheticTrack([{ distanceM: 4000, gradePct: 9, speedMs: 2.4, hr: 166 }]);
const slow = syntheticTrack([{ distanceM: 4000, gradePct: 9, speedMs: 2.0, hr: 170 }]);

describe("alignAttempts", () => {
  it("por distancia: la ventaja crece linealmente", () => {
    const s = alignAttempts(fast, slow, "distance", 100);
    expect(s[0]).toMatchObject({ x: 0, deltaS: 0 });
    const end = s[s.length - 1]!;
    expect(end.x).toBe(4000);
    // 4000/2,4 − 4000/2 = −333 s
    expect(end.deltaS).toBeCloseTo(-333.3, 0);
    expect(end.current.hr).toBe(166);
    expect(end.ghost.hr).toBe(170);
  });

  it("por desnivel: mismo resultado en una subida uniforme", () => {
    const s = alignAttempts(fast, slow, "elevation", 10);
    const end = s[s.length - 1]!;
    expect(end.x).toBeGreaterThanOrEqual(350);
    expect(end.x).toBeLessThanOrEqual(360);
    // la ventaja es proporcional a la altura alcanzada
    expect(end.deltaS).toBeCloseTo((-333.3 * end.x) / 360, 0);
  });

  it("recorta al más corto de los dos", () => {
    const short = syntheticTrack([{ distanceM: 2000, gradePct: 9, speedMs: 2, hr: 160 }]);
    const s = alignAttempts(fast, short, "distance", 500);
    expect(s.map((x) => x.x)).toEqual([0, 500, 1000, 1500, 2000]);
  });

  it("ignora tiempo parado al alinear", () => {
    const paused = [...slow.slice(0, 500), ...slow.slice(500).map((p) => ({ ...p, t: p.t + 60 }))];
    const withStop = [...paused.slice(0, 500), { ...paused[499]!, t: paused[499]!.t + 30 }, ...paused.slice(500)];
    const s = alignAttempts(withStop, slow, "distance", 1000);
    expect(s[s.length - 1]!.deltaS).toBeCloseTo(60, 0);
  });

  it("intentos vacíos", () => {
    expect(alignAttempts([], [], "distance")).toEqual([{ x: 0, current: { t: 0, hr: null }, ghost: { t: 0, hr: null }, deltaS: 0 }]);
  });
});

describe("alignAttempts con ruido de altitud", () => {
  it("el ruido del barómetro no desalinea el eje de desnivel", () => {
    const noisyFast = syntheticTrack([{ distanceM: 4000, gradePct: 9, speedMs: 2.4, hr: 166 }], undefined, { noiseM: 1, seed: 2 });
    const noisySlow = syntheticTrack([{ distanceM: 4000, gradePct: 9, speedMs: 2.0, hr: 170 }], undefined, { noiseM: 1, seed: 9 });
    const s = alignAttempts(noisyFast, noisySlow, "elevation", 10);
    const end = s[s.length - 1]!;
    expect(end.x).toBeLessThanOrEqual(365);
    expect(Math.abs(end.deltaS + 333)).toBeLessThan(15);
  });
});
