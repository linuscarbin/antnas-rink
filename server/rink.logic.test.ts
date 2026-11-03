import { describe, expect, it } from "vitest";
import {
  findBookingConflicts,
  getIsoWeek,
  rotateTeams,
  ZONES,
  ZONE_LABELS,
  type BookingSlot,
} from "../shared/rink";

type B = BookingSlot;
const h = (n: number) => n * 3600 * 1000;
const conflicts = findBookingConflicts;

describe("booking conflict rule (shared/rink.ts)", () => {
  it("allows back-to-back bookings (edge touching)", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(19), zone: "full rink" }];
    expect(conflicts(existing, h(19), h(20), "full rink")).toHaveLength(0);
  });

  it("detects overlapping full rink bookings", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(20), zone: "full rink" }];
    expect(conflicts(existing, h(19), h(21), "full rink")).toHaveLength(1);
  });

  it("full rink blocks a half, and a half blocks full rink", () => {
    const full: B[] = [{ id: 1, start: h(18), end: h(20), zone: "full rink" }];
    expect(conflicts(full, h(19), h(21), "half rink")).toHaveLength(1);
    const half: B[] = [{ id: 1, start: h(18), end: h(20), zone: "half rink" }];
    expect(conflicts(half, h(19), h(21), "full rink")).toHaveLength(1);
  });

  it("two halves can be booked at the same time", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(20), zone: "half rink" }];
    expect(conflicts(existing, h(18), h(20), "half rink")).toHaveLength(0);
  });

  it("a third half is rejected", () => {
    const existing: B[] = [
      { id: 1, start: h(18), end: h(20), zone: "half rink" },
      { id: 2, start: h(19), end: h(21), zone: "half rink" },
    ];
    expect(conflicts(existing, h(19), h(20), "half rink")).not.toHaveLength(0);
  });

  it("two halves that don't overlap each other leave room for one more", () => {
    // 18-19 and 19-20 never coexist, so a new 18-20 half fits.
    const existing: B[] = [
      { id: 1, start: h(18), end: h(19), zone: "half rink" },
      { id: 2, start: h(19), end: h(20), zone: "half rink" },
    ];
    expect(conflicts(existing, h(18), h(20), "half rink")).toHaveLength(0);
  });

  it("non-overlapping times never conflict", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(19), zone: "full rink" }];
    expect(conflicts(existing, h(20), h(21), "full rink")).toHaveLength(0);
  });
});

describe("zone labels and constants", () => {
  it("has exactly whole rink and half rink", () => {
    expect(ZONES).toEqual(["full rink", "half rink"]);
  });
  it("has a Swedish label for each zone", () => {
    for (const z of ZONES) {
      expect(ZONE_LABELS[z]).toBeTruthy();
    }
  });
});

describe("ISO week", () => {
  it("computes a known ISO week", () => {
    // 2026-01-01 is a Thursday → ISO week 1 of 2026
    const { year, week } = getIsoWeek(new Date(Date.UTC(2026, 0, 1)));
    expect(year).toBe(2026);
    expect(week).toBe(1);
  });

  it("returns a week between 1 and 53", () => {
    const { week } = getIsoWeek(new Date(Date.UTC(2026, 6, 15)));
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });
});

describe("rotateTeams", () => {
  it("rotates teams in order across new year (2026 has an ISO week 53)", () => {
    const r = rotateTeams({ year: 2026, week: 51 }, { year: 2027, week: 2 }, [10, 20, 30]);
    expect(r.map((x) => `${x.year}-${x.week}:${x.teamId}`)).toEqual([
      "2026-51:10",
      "2026-52:20",
      "2026-53:30",
      "2027-1:10",
      "2027-2:20",
    ]);
  });
  it("can start with another team", () => {
    const r = rotateTeams({ year: 2026, week: 45 }, { year: 2026, week: 46 }, [1, 2, 3], 2);
    expect(r.map((x) => x.teamId)).toEqual([3, 1]);
  });
  it("returns nothing without teams or when range is reversed", () => {
    expect(rotateTeams({ year: 2026, week: 45 }, { year: 2026, week: 50 }, [])).toEqual([]);
    expect(rotateTeams({ year: 2026, week: 50 }, { year: 2026, week: 45 }, [1])).toEqual([]);
  });
});
