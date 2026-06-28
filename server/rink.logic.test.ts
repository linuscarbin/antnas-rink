import { describe, expect, it } from "vitest";
import { getIsoWeek, ZONES, ZONE_LABELS } from "../shared/rink";

/**
 * Pure re-implementation of the zone/overlap conflict rule used by
 * findConflictingBookings, so we can unit-test the logic without a DB.
 */
type Zone = (typeof ZONES)[number];
type B = { id: number; start: number; end: number; zone: Zone };

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  // strict: back-to-back (edge-touching) does NOT overlap
  return bStart < aEnd && bEnd > aStart;
}

function conflicts(
  existing: B[],
  newStart: number,
  newEnd: number,
  zone: Zone
): B[] {
  return existing.filter((b) => {
    if (!overlaps(newStart, newEnd, b.start, b.end)) return false;
    if (b.zone === "full rink" || zone === "full rink") return true;
    return b.zone === zone;
  });
}

const h = (n: number) => n * 3600 * 1000;

describe("booking overlap rule", () => {
  it("allows back-to-back bookings (edge touching)", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(19), zone: "full rink" }];
    // new booking 19-20 starts exactly when previous ends → no conflict
    expect(conflicts(existing, h(19), h(20), "full rink")).toHaveLength(0);
  });

  it("detects overlapping full rink bookings", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(20), zone: "full rink" }];
    expect(conflicts(existing, h(19), h(21), "full rink")).toHaveLength(1);
  });

  it("full rink blocks any zone during overlap", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(20), zone: "full rink" }];
    expect(conflicts(existing, h(19), h(21), "one end")).toHaveLength(1);
    expect(conflicts(existing, h(19), h(21), "half rink")).toHaveLength(1);
  });

  it("different zones do not conflict (one end vs half rink)", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(20), zone: "one end" }];
    expect(conflicts(existing, h(18), h(20), "half rink")).toHaveLength(0);
  });

  it("same non-full zone conflicts on overlap", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(20), zone: "one end" }];
    expect(conflicts(existing, h(19), h(21), "one end")).toHaveLength(1);
  });

  it("non-overlapping times never conflict", () => {
    const existing: B[] = [{ id: 1, start: h(18), end: h(19), zone: "full rink" }];
    expect(conflicts(existing, h(20), h(21), "full rink")).toHaveLength(0);
  });
});

describe("zone labels and constants", () => {
  it("keeps exact required zone keys", () => {
    expect(ZONES).toEqual(["full rink", "one end", "half rink"]);
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
