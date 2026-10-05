import { describe, expect, it } from "vitest";
import { sampleWeek } from "../sample/week";
import { formatDurationToken, stepLine, toIntervalsDescription, toIntervalsText } from "./intervalsText";
import { workoutSeconds, formatDuration } from "./duration";

const week = sampleWeek("2026-10-05");
const quality = week[1]!;

describe("toIntervalsText", () => {
  it("calidad 3×10' Z3 con calentamiento y vuelta a la calma", () => {
    expect(toIntervalsText(quality)).toBe(
      ["Warmup", "- 20m Z1 HR", "", "Main Set 3x", "- Subida 10m Z3 HR", "- Bajada trote 5m Z1 HR", "", "Cooldown", "- 10m Z1 HR"].join("\n"),
    );
  });

  it("rango de zonas", () => {
    expect(toIntervalsText(week[5]!)).toBe("Main Set\n- 3h30m Z1-Z2 HR");
  });

  it("sin pasos (fuerza) devuelve texto vacío", () => {
    expect(toIntervalsText(week[0]!)).toBe("");
  });
});

describe("stepLine", () => {
  it("distancia en km y metros (mtr, porque m son minutos)", () => {
    expect(stepLine({ kind: "step", distanceM: 2000, target: { kind: "hrZone", zone: "Z2" } })).toBe("- 2km Z2 HR");
    expect(stepLine({ kind: "step", distanceM: 400 })).toBe("- 400mtr");
  });
  it("porcentaje de LTHR y pulsar vuelta", () => {
    expect(stepLine({ kind: "step", lapButton: true, durationS: 600, target: { kind: "lthrPct", min: 85, max: 89 } })).toBe(
      "- Press lap 10m 85-89% LTHR",
    );
  });
  it("la indicación no puede contener números que el parser confunda", () => {
    expect(stepLine({ kind: "step", label: "Rampa 2 al 10%", durationS: 180 })).toBe("- Rampa al 3m");
  });
});

describe("formatDurationToken", () => {
  it.each([
    [30, "30s"],
    [600, "10m"],
    [3750, "1h2m30s"],
    [7200, "2h"],
  ])("%i s → %s", (s, t) => expect(formatDurationToken(s)).toBe(t));
});

describe("toIntervalsDescription", () => {
  it("antepone objetivo y premisas como notas", () => {
    const d = toIntervalsDescription(quality);
    expect(d.startsWith("Tempo en subida")).toBe(true);
    expect(d).toContain("Bajadas de recuperación al trote, sin frenar\n\nWarmup");
  });
});

describe("notas seguras para el parser", () => {
  it("un 4x en una premisa no abre repeticiones y se quitan guiones iniciales", () => {
    const d = toIntervalsDescription({ ...quality, physiologicalGoal: "", premises: ["Step-up 4x8", "- sin prisa", ""] });
    expect(d.split("\n\n")[0]).toBe("Step-up 4×8\nsin prisa");
  });
});

describe("duración", () => {
  it("suma pasos y repeticiones", () => {
    expect(workoutSeconds(quality)).toBe((20 + 3 * 15 + 10) * 60);
    expect(formatDuration(workoutSeconds(quality))).toBe("1 h 15'");
  });
  it("usa la planificada si no hay pasos", () => {
    expect(formatDuration(workoutSeconds(week[0]!))).toBe("45'");
  });
});
