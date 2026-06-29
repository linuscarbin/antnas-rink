import { describe, expect, it } from "vitest";
import { isTomorrow } from "./bingoReminder";

describe("isTomorrow", () => {
  const ref = new Date("2026-07-05T12:00:00");

  it("is true for the next calendar day", () => {
    expect(isTomorrow(new Date("2026-07-06T17:00:00"), ref)).toBe(true);
  });

  it("is true regardless of time of day on the next day", () => {
    expect(isTomorrow(new Date("2026-07-06T23:59:00"), ref)).toBe(true);
    expect(isTomorrow(new Date("2026-07-06T00:01:00"), ref)).toBe(true);
  });

  it("is false for today", () => {
    expect(isTomorrow(new Date("2026-07-05T17:00:00"), ref)).toBe(false);
  });

  it("is false for two days ahead", () => {
    expect(isTomorrow(new Date("2026-07-07T17:00:00"), ref)).toBe(false);
  });

  it("handles month boundaries", () => {
    const endOfMonth = new Date("2026-07-31T12:00:00");
    expect(isTomorrow(new Date("2026-08-01T17:00:00"), endOfMonth)).toBe(true);
  });
});
