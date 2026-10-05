import { describe, expect, it } from "vitest";
import { hrZonesFromThreshold, zoneForHr } from "./zones";

describe("hrZonesFromThreshold", () => {
  const zones = hrZonesFromThreshold(185);
  it("FC umbral provisional 185 ppm", () => {
    expect(zones.map((z) => [z.zone, z.min, z.max])).toEqual([
      ["Z1", 0, 157],
      ["Z2", 158, 166],
      ["Z3", 167, 175],
      ["Z4", 176, 184],
      ["Z5", 185, null],
    ]);
  });
  it("zoneForHr", () => {
    expect(zoneForHr(150, zones)).toBe("Z1");
    expect(zoneForHr(166, zones)).toBe("Z2");
    expect(zoneForHr(170, zones)).toBe("Z3");
    expect(zoneForHr(190, zones)).toBe("Z5");
  });
});
