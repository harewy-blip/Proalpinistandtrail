import { describe, expect, it } from "vitest";
import { sampleWeek } from "../sample/week";
import { validateWorkout } from "./validate";

const week = sampleWeek("2026-10-05");

describe("validateWorkout", () => {
  it("acepta toda la semana de ejemplo sin cambios", () => {
    for (const w of week) {
      const r = validateWorkout(JSON.parse(JSON.stringify(w)));
      expect(r).toEqual({ ok: true, workout: w });
    }
  });

  it("descarta campos desconocidos", () => {
    const r = validateWorkout({ ...week[2], userId: "otro", sections: [{ title: "Main Set", items: [{ kind: "step", durationS: 600, evil: 1 }] }] });
    expect(r.ok && r.workout).toEqual({ ...week[2], sections: [{ title: "Main Set", items: [{ kind: "step", durationS: 600 }] }] });
  });

  it("reúne todos los errores", () => {
    const r = validateWorkout({
      date: "2026-13-45",
      name: "",
      type: "nap",
      sport: "Swim",
      sections: [{ title: "Main Set", items: [{ kind: "step" }, { kind: "repeat", times: 0, steps: [] }, { kind: "step", durationS: 60, target: { kind: "hrZoneRange", from: "Z3", to: "Z1" } }] }],
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors).toEqual([
      "Fecha inválida (YYYY-MM-DD)",
      "Falta el nombre",
      "Tipo de sesión inválido",
      "Deporte inválido",
      "Sección 1, paso 1: indica duración o distancia",
      "Sección 1, paso 2: repeticiones entre 1 y 50",
      "Sección 1, paso 2: la repetición no tiene pasos",
      "Sección 1, paso 3: objetivo inválido",
    ]);
  });

  it("rechaza lo que no es un objeto", () => {
    expect(validateWorkout(null)).toEqual({ ok: false, errors: ["El entrenamiento debe ser un objeto"] });
    expect(validateWorkout([]).ok).toBe(false);
  });
});
