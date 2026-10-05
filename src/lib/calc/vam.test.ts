import { describe, expect, it } from "vitest";
import { vam } from "./vam";

describe("vam", () => {
  it("360 m en 30 min = 720 m/h", () => {
    expect(vam(360, 1800)).toBe(720);
  });
  it("duración nula", () => {
    expect(vam(100, 0)).toBe(0);
  });
});
