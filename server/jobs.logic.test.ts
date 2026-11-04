import { describe, expect, it } from "vitest";
import { formatJobWindow } from "../shared/jobs";

// 2026-01-15 12:00 Stockholm (CET, UTC+1)
const now = new Date("2026-01-15T11:00:00Z");
const at = (iso: string) => new Date(iso);

describe("formatJobWindow", () => {
  it("says ikväll for this evening", () => {
    expect(formatJobWindow(at("2026-01-15T17:00:00Z"), at("2026-01-15T19:00:00Z"), now)).toBe("ikväll 18:00–20:00");
  });
  it("says idag for earlier today", () => {
    expect(formatJobWindow(at("2026-01-15T12:00:00Z"), at("2026-01-15T13:30:00Z"), now)).toBe("idag 13:00–14:30");
  });
  it("says imorgon for tomorrow", () => {
    expect(formatJobWindow(at("2026-01-16T06:00:00Z"), at("2026-01-16T08:00:00Z"), now)).toBe("imorgon 07:00–09:00");
  });
  it("uses weekday and date further ahead", () => {
    expect(formatJobWindow(at("2026-01-20T17:00:00Z"), at("2026-01-20T19:00:00Z"), now)).toMatch(/^tis 20 jan\.? 18:00–20:00$/);
  });
});

import { parseHelpers, workedBy } from "../shared/jobs";

describe("workedBy", () => {
  it("joins names in Swedish", () => {
    expect(workedBy("Kalle")).toBe("Kalle");
    expect(workedBy("Kalle", ["Lisa"])).toBe("Kalle och Lisa");
    expect(workedBy("Kalle", ["Lisa", "Olle"])).toBe("Kalle, Lisa och Olle");
  });
  it("removes duplicates and empty names", () => {
    expect(workedBy("Kalle", ["Kalle", " ", "Lisa"])).toBe("Kalle och Lisa");
  });
  it("shortens long lists", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Person${i}`);
    const out = workedBy("Kalle", many, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("m.fl.")).toBe(true);
  });
});

describe("parseHelpers", () => {
  it("splits on comma, och, & and +", () => {
    expect(parseHelpers("Lisa, Olle och Sven & Anna + Bo")).toEqual(["Lisa", "Olle", "Sven", "Anna", "Bo"]);
    expect(parseHelpers("")).toEqual([]);
    expect(parseHelpers(undefined)).toEqual([]);
  });
});

import { fromStockholm, stockholmParts } from "../shared/jobs";

describe("Swedish time conversion", () => {
  it("winter time is UTC+1", () => {
    expect(fromStockholm("2026-01-15", "18:00").toISOString()).toBe("2026-01-15T17:00:00.000Z");
  });
  it("summer time is UTC+2", () => {
    expect(fromStockholm("2026-07-01", "18:00").toISOString()).toBe("2026-07-01T16:00:00.000Z");
  });
  it("round-trips", () => {
    const d = fromStockholm("2026-11-05", "07:30");
    expect(stockholmParts(d)).toEqual({ day: "2026-11-05", hour: 7, minute: 30 });
  });
});
