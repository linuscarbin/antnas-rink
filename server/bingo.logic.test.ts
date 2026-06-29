import { describe, expect, it } from "vitest";
import {
  distributeShifts,
  shiftsPerFamily,
  type FamilyInput,
  type OccasionInput,
} from "../shared/bingo";

function occasions(n: number, target = 20): OccasionInput[] {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1, target }));
}

describe("distributeShifts", () => {
  it("fills occasions up to their target when enough families", () => {
    const occ = occasions(2, 3); // 6 slots
    const fams: FamilyInput[] = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      activeCount: 1,
      unavailable: [],
    }));
    const planned = distributeShifts(fams, occ);
    expect(planned.length).toBe(6);
    // Each occasion gets exactly 3.
    const perOcc = new Map<number, number>();
    for (const p of planned)
      perOcc.set(p.occasionId, (perOcc.get(p.occasionId) ?? 0) + 1);
    expect(perOcc.get(1)).toBe(3);
    expect(perOcc.get(2)).toBe(3);
  });

  it("gives families with more active children more shifts", () => {
    // 8 occasions x 1 slot = 8 shifts, split across families by activeCount.
    // Shares: fam1=2/4, fam2=1/4, fam3=1/4 -> ~4 / ~2 / ~2.
    const occ = occasions(8, 1);
    const fams: FamilyInput[] = [
      { id: 1, activeCount: 2, unavailable: [] },
      { id: 2, activeCount: 1, unavailable: [] },
      { id: 3, activeCount: 1, unavailable: [] },
    ];
    const planned = distributeShifts(fams, occ);
    const per = shiftsPerFamily(planned);
    // Family 1 (2 active) should get more shifts than family 2 (1 active).
    expect(per.get(1) ?? 0).toBeGreaterThan(per.get(2) ?? 0);
  });

  it("never assigns a family to the same occasion twice", () => {
    const occ = occasions(3, 5);
    const fams: FamilyInput[] = [{ id: 1, activeCount: 1, unavailable: [] }];
    const planned = distributeShifts(fams, occ);
    const seen = new Set<string>();
    for (const p of planned) {
      const key = `${p.familyId}-${p.occasionId}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("respects unavailable occasions", () => {
    const occ = occasions(3, 2);
    const fams: FamilyInput[] = [
      { id: 1, activeCount: 5, unavailable: [2] },
      { id: 2, activeCount: 1, unavailable: [] },
    ];
    const planned = distributeShifts(fams, occ);
    // Family 1 must never be on occasion 2.
    expect(planned.some((p) => p.familyId === 1 && p.occasionId === 2)).toBe(false);
  });

  it("keeps locked assignments and fills the rest", () => {
    const occ = occasions(2, 2); // 4 slots
    const fams: FamilyInput[] = [
      { id: 1, activeCount: 1, unavailable: [] },
      { id: 2, activeCount: 1, unavailable: [] },
      { id: 3, activeCount: 1, unavailable: [] },
      { id: 4, activeCount: 1, unavailable: [] },
    ];
    const locked = [{ occasionId: 1, familyId: 1 }];
    const planned = distributeShifts(fams, occ, locked);
    // 3 new slots remain (4 total - 1 locked).
    expect(planned.length).toBe(3);
    // Family 1 should not be re-added to occasion 1.
    expect(planned.some((p) => p.familyId === 1 && p.occasionId === 1)).toBe(false);
  });
});
