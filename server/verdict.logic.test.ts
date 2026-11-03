import { describe, expect, it } from "vitest";
import { rinkVerdict, trackVerdict } from "../shared/verdict";

const now = new Date("2026-01-15T18:00:00Z").getTime();
const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000);

describe("rinkVerdict", () => {
  it("is red when closed, regardless of status", () => {
    const v = rinkVerdict({ closedMessage: "Match pågår", plogadAt: hoursAgo(1), now });
    expect(v.level).toBe("red");
    expect(v.detail).toBe("Match pågår");
  });
  it("is green when plowed in the last 36h and cold", () => {
    expect(rinkVerdict({ plogadAt: hoursAgo(5), temperature: -8, now }).level).toBe("green");
  });
  it("uses the most recent of plogad/spolad", () => {
    expect(
      rinkVerdict({ plogadAt: hoursAgo(200), spoladAt: hoursAgo(10), now }).level
    ).toBe("green");
  });
  it("is yellow when fresh but thawing", () => {
    expect(rinkVerdict({ spoladAt: hoursAgo(2), temperature: 3, now }).level).toBe("yellow");
  });
  it("is yellow when cared for within a week", () => {
    expect(rinkVerdict({ plogadAt: hoursAgo(72), now }).level).toBe("yellow");
  });
  it("is unknown when nothing reported", () => {
    expect(rinkVerdict({ now }).level).toBe("unknown");
    expect(rinkVerdict({ plogadAt: hoursAgo(24 * 10), now }).level).toBe("unknown");
  });
  it("ignores a blank closed message", () => {
    expect(rinkVerdict({ closedMessage: "  ", plogadAt: hoursAgo(1), now }).level).toBe("green");
  });
});

describe("trackVerdict", () => {
  it("is red when not skiable", () => {
    expect(trackVerdict({ condition: "Ej åkbart", dragetAt: hoursAgo(1), now }).level).toBe("red");
  });
  it("is green for good condition recently groomed", () => {
    expect(trackVerdict({ condition: "Bra", dragetAt: hoursAgo(10), now }).level).toBe("green");
  });
  it("is yellow for good condition but old grooming", () => {
    expect(trackVerdict({ condition: "Bra", dragetAt: hoursAgo(100), now }).level).toBe("yellow");
  });
  it("is unknown when nothing reported", () => {
    expect(trackVerdict({ now }).level).toBe("unknown");
  });
});
