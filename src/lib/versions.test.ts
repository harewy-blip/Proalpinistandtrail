import { describe, expect, it } from "vitest";
import { getVersionsView } from "./versions";

describe("getVersionsView", () => {
  const v = getVersionsView("2026-10-05");
  it("ordena del más reciente al más antiguo y compara con 3, 6 y 12 meses", () => {
    expect(v.efforts.map((e) => e.monthsAgo)).toEqual([0, 3, 6, 12]);
    expect(v.comparisons.map((c) => c.against.monthsAgo)).toEqual([3, 6, 12]);
    for (const c of v.comparisons) {
      expect(c.deltaS).toBeLessThan(0);
      expect(c.deltaVam).toBeGreaterThan(0);
    }
  });
  it("fantasma por desnivel para cada intento anterior", () => {
    expect(Object.keys(v.ghosts)).toHaveLength(3);
    const g = v.ghosts["chalo-12"]!;
    expect(g[0]!.x).toBe(0);
    expect(g[g.length - 1]!.deltaS).toBeLessThan(-300);
  });
  it("récords", () => {
    expect(v.records.bestVam.monthsAgo).toBe(0);
    expect(v.records.bestTime.monthsAgo).toBe(0);
  });
});
