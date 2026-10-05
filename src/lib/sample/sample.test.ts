import { describe, expect, it } from "vitest";
import { sampleChaloEfforts, sampleWeek, mondayOf } from ".";

describe("datos de ejemplo", () => {
  it("la semana empieza en lunes y tiene 7 días", () => {
    const w = sampleWeek("2026-10-08");
    expect(mondayOf("2026-10-08")).toBe("2026-10-05");
    expect(w.map((d) => d.date)).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
    expect(w[1]!.type).toBe("quality");
    expect(w[5]!.type).toBe("mountain");
  });

  it("los intentos del Chalo rondan los 360 m y mejoran con el tiempo", () => {
    const efforts = sampleChaloEfforts("2026-10-05");
    for (const e of efforts) {
      expect(e.climb.gainM).toBeGreaterThan(330);
      expect(e.climb.gainM).toBeLessThan(380);
    }
    const vams = efforts.map((e) => e.climb.vam);
    expect([...vams].sort((a, b) => a - b)).toEqual(vams);
  });
});
