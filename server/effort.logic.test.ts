import { describe, expect, it } from "vitest";

type Effort = {
  id: number;
  kind: "plogad" | "spolad" | "draget";
  byName: string;
  helpers: string | null;
  createdAt: Date;
};

function leaderboard(
  all: Effort[],
  kinds: Array<"plogad" | "spolad" | "draget">,
  since?: Date
) {
  const counts = new Map<string, number>();
  for (const e of all) {
    if (!kinds.includes(e.kind)) continue;
    if (since && e.createdAt < since) continue;
    const names = [e.byName, ...(e.helpers ? e.helpers.split(",") : [])]
      .map((n) => n.trim())
      .filter(Boolean);
    for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function removeLatest(all: Effort[], kind: "plogad" | "spolad" | "draget") {
  const ofKind = all.filter((e) => e.kind === kind).sort((a, b) => b.id - a.id);
  if (!ofKind[0]) return all;
  return all.filter((e) => e.id !== ofKind[0].id);
}

const now = new Date();
const base: Effort[] = [
  { id: 1, kind: "plogad", byName: "Erik", helpers: "Anna", createdAt: now },
  { id: 2, kind: "plogad", byName: "Erik", helpers: null, createdAt: now },
  { id: 3, kind: "spolad", byName: "Anna", helpers: "Erik, Johan", createdAt: now },
  { id: 4, kind: "draget", byName: "Johan", helpers: null, createdAt: now },
];

describe("effort leaderboard", () => {
  it("counts registrant and helpers across rink kinds", () => {
    const lb = leaderboard(base, ["plogad", "spolad"]);
    // Erik: plogad#1, plogad#2, helper on spolad#3 = 3
    // Anna: helper on plogad#1, spolad#3 = 2
    // Johan: helper on spolad#3 = 1
    expect(lb).toEqual([
      { name: "Erik", count: 3 },
      { name: "Anna", count: 2 },
      { name: "Johan", count: 1 },
    ]);
  });

  it("isolates ski-track kind", () => {
    expect(leaderboard(base, ["draget"])).toEqual([{ name: "Johan", count: 1 }]);
  });

  it("excludes efforts before the season start", () => {
    const old: Effort[] = [
      { id: 9, kind: "plogad", byName: "Gammal", helpers: null, createdAt: new Date("2000-01-01") },
      ...base,
    ];
    const lb = leaderboard(old, ["plogad", "spolad"], new Date("2020-01-01"));
    expect(lb.find((r) => r.name === "Gammal")).toBeUndefined();
  });
});

describe("undo removes latest effort of a kind", () => {
  it("removes the highest-id plogad row only", () => {
    const after = removeLatest(base, "plogad");
    expect(after.find((e) => e.id === 2)).toBeUndefined();
    expect(after.find((e) => e.id === 1)).toBeDefined();
    expect(after.find((e) => e.id === 3)).toBeDefined();
  });
});
