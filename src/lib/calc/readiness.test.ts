import { describe, expect, it } from "vitest";
import { readiness } from "./readiness";

describe("readiness", () => {
  it("todo en verde", () => {
    const r = readiness({ sleepH: 7.6, restingHr: 46, restingHrBaseline: 45, soreness: 2, form: -8 });
    expect(r.light).toBe("green");
    expect(r.signals).toHaveLength(4);
  });
  it("la peor señal manda", () => {
    const r = readiness({ sleepH: 7.6, restingHr: 54, restingHrBaseline: 45, soreness: 2, form: -8 });
    expect(r.light).toBe("red");
    expect(r.signals.find((s) => s.key === "restingHr")?.value).toBe("54 ppm (+9)");
  });
  it("datos parciales", () => {
    const r = readiness({ sleepH: 6.5 });
    expect(r.light).toBe("amber");
    expect(r.signals).toHaveLength(1);
  });
  it("sin datos queda en verde y sin señales", () => {
    expect(readiness({})).toEqual({ light: "green", signals: [] });
  });
});
