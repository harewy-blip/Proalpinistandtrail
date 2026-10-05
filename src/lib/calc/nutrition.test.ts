import { describe, expect, it } from "vitest";
import { dayCarbs, intraSessionCarbs, recoveryFuel, sessionBand } from "./nutrition";

describe("sessionBand", () => {
  it.each([
    [{ type: "strength", durationMin: 60 }, "rest"],
    [{ type: "climbing", durationMin: 120 }, "rest"],
    [{ type: "aerobic", durationMin: 50 }, "easy"],
    [{ type: "aerobic", durationMin: 100 }, "moderate"],
    [{ type: "quality", durationMin: 70 }, "moderate"],
    [{ type: "mountain", durationMin: 120 }, "moderate"],
    [{ type: "mountain", durationMin: 200 }, "long"],
    [{ type: "race", durationMin: 90 }, "long"],
  ] as const)("%o → %s", (s, band) => {
    expect(sessionBand(s)).toBe(band);
  });
});

describe("dayCarbs", () => {
  it("descanso para 68 kg: 3–5 g/kg", () => {
    const r = dayCarbs({ weightKg: 68, today: [] });
    expect(r.band).toBe("rest");
    expect(r.carbsG).toEqual({ min: 204, max: 340 });
    expect(r.carbsTargetG).toBe(270);
    expect(r.proteinG).toEqual({ min: 109, max: 136 });
  });

  it("calidad del martes: 6–8 g/kg", () => {
    const r = dayCarbs({ weightKg: 68, today: [{ type: "quality", durationMin: 75 }] });
    expect(r.band).toBe("moderate");
    expect(r.carbsG).toEqual({ min: 408, max: 544 });
  });

  it("doble sesión aeróbica sube a la banda de larga", () => {
    const r = dayCarbs({
      weightKg: 68,
      today: [
        { type: "aerobic", durationMin: 45 },
        { type: "bike", durationMin: 60 },
      ],
    });
    expect(r.band).toBe("long");
  });

  it("fuerza + rodaje no cuenta como doble sesión", () => {
    const r = dayCarbs({
      weightKg: 68,
      today: [
        { type: "strength", durationMin: 45 },
        { type: "aerobic", durationMin: 45 },
      ],
    });
    expect(r.band).toBe("easy");
  });

  it("viernes de descanso con larga el sábado sube a 6–8", () => {
    const r = dayCarbs({ weightKg: 68, today: [], tomorrow: [{ type: "mountain", durationMin: 210 }] });
    expect(r.band).toBe("moderate");
    expect(r.reasons.join(" ")).toMatch(/Mañana larga/);
  });

  it("pre-prueba A manda sobre todo", () => {
    const r = dayCarbs({ weightKg: 68, today: [], preRaceA: true });
    expect(r.band).toBe("carbLoad");
    expect(r.proteinG).toEqual({ min: 109, max: 109 });
  });
});

describe("intraSessionCarbs", () => {
  it("< 60' agua", () => expect(intraSessionCarbs({ type: "aerobic", durationMin: 50 }).carbsGPerHour.max).toBe(0));
  it("60–150' 30–60 g/h", () =>
    expect(intraSessionCarbs({ type: "quality", durationMin: 90 }).carbsGPerHour).toEqual({ min: 30, max: 60 }));
  it("> 150' 60–90 g/h", () =>
    expect(intraSessionCarbs({ type: "mountain", durationMin: 200 }).carbsGPerHour).toEqual({ min: 60, max: 90 }));
});

describe("recoveryFuel", () => {
  it("tras calidad", () => expect(recoveryFuel({ type: "quality", durationMin: 70 }, 68)).toEqual({ carbsG: { min: 68, max: 82 }, proteinG: 20 }));
  it("no tras rodaje suave", () => expect(recoveryFuel({ type: "aerobic", durationMin: 50 }, 68)).toBeNull());
});
