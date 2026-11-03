import { describe, expect, it } from "vitest";
import { decodeTopics, encodeTopics, groupSize, isQuietTime } from "../shared/push";
import { snowLast24h } from "./snowAlert";

describe("quiet hours (Swedish time)", () => {
  it("is quiet late evening and night", () => {
    // 2026-01-15 21:30 UTC = 22:30 in Stockholm (CET, UTC+1)
    expect(isQuietTime(new Date("2026-01-15T21:30:00Z"))).toBe(true);
    // 05:30 UTC = 06:30 Stockholm
    expect(isQuietTime(new Date("2026-01-15T05:30:00Z"))).toBe(true);
  });
  it("is not quiet during the day", () => {
    // 06:05 UTC = 07:05 Stockholm
    expect(isQuietTime(new Date("2026-01-15T06:05:00Z"))).toBe(false);
    expect(isQuietTime(new Date("2026-01-15T16:00:00Z"))).toBe(false);
  });
  it("handles summer time (CEST, UTC+2)", () => {
    // 2026-07-01 20:30 UTC = 22:30 Stockholm
    expect(isQuietTime(new Date("2026-07-01T20:30:00Z"))).toBe(true);
    expect(isQuietTime(new Date("2026-07-01T19:30:00Z"))).toBe(false);
  });
});

describe("topic encoding", () => {
  it("round-trips and drops unknown topics", () => {
    const enc = encodeTopics(["rink_spolad", "group", "bogus", "group"]);
    expect(enc).toBe(",rink_spolad,group,");
    expect(decodeTopics(enc)).toEqual(["rink_spolad", "group"]);
    expect(encodeTopics([])).toBe("");
  });
});

describe("group size", () => {
  const at = Date.UTC(2026, 0, 15, 17, 0);
  const min = 60 * 1000;
  it("sums people arriving within an hour", () => {
    expect(
      groupSize(
        [
          { arriveAt: at, people: 1 },
          { arriveAt: at + 30 * min, people: 2 },
          { arriveAt: at + 3 * 60 * min, people: 5 },
        ],
        at
      )
    ).toBe(3);
  });
});

describe("snowLast24h", () => {
  it("sums only the last 24 hours", () => {
    const now = new Date("2026-01-15T07:00:00Z");
    const times = ["2026-01-14T06:00", "2026-01-14T08:00", "2026-01-15T03:00", "2026-01-15T09:00"];
    const cm = [10, 2, 3.5, 7];
    // 06:00 yesterday is >24h ago, 09:00 today is in the future.
    expect(snowLast24h(times, cm, now)).toBe(5.5);
  });
  it("treats null as zero", () => {
    expect(snowLast24h(["2026-01-15T05:00"], [null], new Date("2026-01-15T07:00:00Z"))).toBe(0);
  });
});
