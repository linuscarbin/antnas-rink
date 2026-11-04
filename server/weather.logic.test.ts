import { describe, expect, it } from "vitest";
import { weatherUrl } from "./routers/weather";

describe("weather request", () => {
  it("asks for wind in m/s (API default is km/h)", () => {
    expect(weatherUrl().searchParams.get("wind_speed_unit")).toBe("ms");
  });
  it("uses Antnäs coordinates and gusts", () => {
    const u = weatherUrl("metno_seamless");
    expect(Number(u.searchParams.get("latitude"))).toBeCloseTo(65.53, 1);
    expect(Number(u.searchParams.get("longitude"))).toBeCloseTo(21.89, 1);
    expect(u.searchParams.get("current")).toContain("wind_gusts_10m");
    expect(u.searchParams.get("models")).toBe("metno_seamless");
  });
});
