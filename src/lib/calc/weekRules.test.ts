import { describe, expect, it } from "vitest";
import { sampleWeek } from "../sample/week";
import { checkWeekRules } from "./weekRules";

describe("checkWeekRules", () => {
  it("la semana de ejemplo cumple las reglas", () => {
    expect(checkWeekRules(sampleWeek("2026-10-05"))).toEqual([]);
  });

  it("calidad fuera del martes", () => {
    const v = checkWeekRules([{ date: "2026-10-08", type: "quality" }]);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ ruleId: "quality_weekday", message: "Calidad programada en jueves" });
  });

  it("calidad el viernes y montaña el sábado: dos avisos", () => {
    const v = checkWeekRules([
      { date: "2026-10-10", type: "mountain", name: "Larga" },
      { date: "2026-10-09", type: "quality", name: "Series" },
    ]);
    expect(v.map((x) => x.ruleId)).toEqual(["quality_weekday", "no_consecutive_hard"]);
    expect(v[1]!.dates).toEqual(["2026-10-09", "2026-10-10"]);
  });

  it("día de calidad configurable", () => {
    expect(checkWeekRules([{ date: "2026-10-07", type: "quality" }], { qualityWeekday: 3 })).toEqual([]);
  });
});
