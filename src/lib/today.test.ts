import { describe, expect, it } from "vitest";
import { getTodayView, todayIn, zonesUsed } from "./today";
import { sampleAthlete, sampleWeek } from "./sample";

describe("todayIn", () => {
  it("usa la zona horaria del atleta", () => {
    // 23:30 UTC del 5 de octubre ya es 6 de octubre en Madrid (UTC+2)
    expect(todayIn("Europe/Madrid", new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06");
  });
});

describe("zonesUsed", () => {
  it("expande rangos de zonas", () => {
    const long = sampleWeek("2026-10-05")[5]!;
    expect(zonesUsed(long, sampleAthlete.zones).map((z) => z.zone)).toEqual(["Z1", "Z2"]);
  });
});

describe("getTodayView", () => {
  it("martes de calidad: 6–8 g/kg y zonas Z1 y Z3", () => {
    const v = getTodayView("2026-10-06");
    expect(v.workout?.type).toBe("quality");
    expect(v.nutrition.band).toBe("moderate");
    expect(v.zones.map((z) => z.zone)).toEqual(["Z1", "Z3"]);
    expect(v.intra?.carbsGPerHour).toEqual({ min: 30, max: 60 });
  });
  it("viernes de descanso con larga el sábado", () => {
    const v = getTodayView("2026-10-09");
    expect(v.workout?.type).toBe("rest");
    expect(v.nutrition.band).toBe("moderate");
    expect(v.intra).toBeNull();
  });
  it("domingo mira al lunes de la semana siguiente", () => {
    const v = getTodayView("2026-10-11");
    expect(v.tomorrow?.date).toBe("2026-10-12");
  });
  it("aviso de carga excéntrica de ejemplo", () => {
    expect(getTodayView("2026-10-06").eccentric.warn).toBe(true);
  });
});
