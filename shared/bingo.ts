/**
 * Bilbingo shift distribution (pure, testable).
 *
 * Rules:
 * - Each family gets shifts proportional to its number of active children
 *   (`activeCount`). A family with 2 active children gets ~2x the shifts of a
 *   family with 1 active child.
 * - Each occasion has a target headcount (default 20). The distributor fills
 *   occasions up to their target.
 * - A family is never assigned to the same occasion twice, and its shifts are
 *   spread across different dates.
 * - Families are not assigned to occasions they marked as unavailable.
 * - Locked (pre-existing) assignments are kept and counted toward targets.
 */

export type FamilyInput = {
  id: number;
  activeCount: number;
  /** Occasion ids the family cannot attend. */
  unavailable: number[];
};

export type OccasionInput = {
  id: number;
  target: number;
};

export type ExistingAssignment = {
  occasionId: number;
  familyId: number;
};

export type PlannedAssignment = {
  occasionId: number;
  familyId: number;
};

/**
 * Computes new assignments to add on top of `locked` ones.
 * Returns only the NEW (occasionId, familyId) pairs to insert.
 */
export function distributeShifts(
  families: FamilyInput[],
  occasions: OccasionInput[],
  locked: ExistingAssignment[] = []
): PlannedAssignment[] {
  // Remaining capacity per occasion (after locked assignments).
  const capacity = new Map<number, number>();
  for (const o of occasions) capacity.set(o.id, Math.max(0, o.target));
  for (const l of locked) {
    capacity.set(l.occasionId, (capacity.get(l.occasionId) ?? 0) - 1);
  }

  // Occasions a family is already on (from locked) — avoid duplicates.
  const familyOccasions = new Map<number, Set<number>>();
  // How many shifts each family already has (from locked).
  const familyShiftCount = new Map<number, number>();
  for (const f of families) {
    familyOccasions.set(f.id, new Set());
    familyShiftCount.set(f.id, 0);
  }
  for (const l of locked) {
    familyOccasions.get(l.familyId)?.add(l.occasionId);
    familyShiftCount.set(
      l.familyId,
      (familyShiftCount.get(l.familyId) ?? 0) + 1
    );
  }

  // Total remaining capacity to fill.
  const totalRemaining = Array.from(capacity.values()).reduce(
    (s, c) => s + Math.max(0, c),
    0
  );
  if (totalRemaining <= 0) return [];

  // Target shifts per family, proportional to activeCount.
  const totalActive = families.reduce((s, f) => s + Math.max(0, f.activeCount), 0);
  const lockedTotal = locked.length;
  const grandTotalShifts = lockedTotal + totalRemaining;

  // Desired total shifts (incl locked) per family.
  const desired = new Map<number, number>();
  for (const f of families) {
    const share = totalActive > 0 ? f.activeCount / totalActive : 0;
    desired.set(f.id, share * grandTotalShifts);
  }

  const planned: PlannedAssignment[] = [];

  // Greedy fill: repeatedly pick the family most "behind" its desired share
  // and assign it to the occasion with the most remaining capacity that it is
  // eligible for. Continue until all capacity is used or nobody is eligible.
  let safety = totalRemaining * (families.length + 1) + 100;
  while (safety-- > 0) {
    // Occasions still needing people, most-needed first.
    const openOccasions = occasions
      .filter((o) => (capacity.get(o.id) ?? 0) > 0)
      .sort((a, b) => (capacity.get(b.id) ?? 0) - (capacity.get(a.id) ?? 0));
    if (openOccasions.length === 0) break;

    // Eligible families sorted by deficit (desired - current), highest first.
    const candidates = families
      .map((f) => ({
        f,
        deficit:
          (desired.get(f.id) ?? 0) - (familyShiftCount.get(f.id) ?? 0),
      }))
      .sort((a, b) => b.deficit - a.deficit);

    let assignedSomething = false;
    // Prioritise the neediest family (largest deficit). For that family, place
    // it on the open occasion with most remaining capacity it is eligible for.
    for (const cand of candidates) {
      const eligibleOcc = openOccasions.find(
        (occ) =>
          !familyOccasions.get(cand.f.id)?.has(occ.id) &&
          !cand.f.unavailable.includes(occ.id)
      );
      if (!eligibleOcc) continue;
      planned.push({ occasionId: eligibleOcc.id, familyId: cand.f.id });
      familyOccasions.get(cand.f.id)?.add(eligibleOcc.id);
      familyShiftCount.set(
        cand.f.id,
        (familyShiftCount.get(cand.f.id) ?? 0) + 1
      );
      capacity.set(eligibleOcc.id, (capacity.get(eligibleOcc.id) ?? 0) - 1);
      assignedSomething = true;
      break; // re-evaluate deficits from scratch for fairness
    }

    if (!assignedSomething) {
      // No eligible family for any open occasion (e.g. all unavailable or
      // already assigned). Stop to avoid infinite loop.
      break;
    }
  }

  return planned;
}

/** Summary helper: shifts per family id from a set of assignments. */
export function shiftsPerFamily(
  assignments: { familyId: number }[]
): Map<number, number> {
  const m = new Map<number, number>();
  for (const a of assignments) m.set(a.familyId, (m.get(a.familyId) ?? 0) + 1);
  return m;
}
