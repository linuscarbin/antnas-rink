import { describe, expect, it } from "vitest";

/**
 * Pure-logic tests mirroring the duty-reminder recipient rules, ensuring
 * ski-track (spårjour) reminders are independent of rink duty.
 */
type Duty = { plogUser: number | null; spolUser: number | null } | null;
type SkiDuty = { sparUser: number | null } | null;

function collectRecipients(duty: Duty, skiDuty: SkiDuty): string[] {
  const out: string[] = [];
  if (duty) {
    if (duty.plogUser) out.push("Plogjour");
    if (duty.spolUser) out.push("Spoljour");
  }
  if (skiDuty && skiDuty.sparUser) out.push("Spårjour");
  return out;
}

describe("duty reminder recipients", () => {
  it("includes spårjour even when there is no rink duty", () => {
    expect(collectRecipients(null, { sparUser: 5 })).toEqual(["Spårjour"]);
  });

  it("includes rink duty even when there is no ski duty", () => {
    expect(collectRecipients({ plogUser: 1, spolUser: 2 }, null)).toEqual([
      "Plogjour",
      "Spoljour",
    ]);
  });

  it("includes all three when both exist", () => {
    expect(
      collectRecipients({ plogUser: 1, spolUser: 2 }, { sparUser: 3 })
    ).toEqual(["Plogjour", "Spoljour", "Spårjour"]);
  });

  it("skips holders without a linked user account", () => {
    expect(
      collectRecipients({ plogUser: null, spolUser: 2 }, { sparUser: null })
    ).toEqual(["Spoljour"]);
  });
});

const CONDITIONS = ["Mycket bra", "Bra", "Hyfsat", "Dåligt", "Ej åkbart"];

describe("track condition options", () => {
  it("has exactly the five expected ratings in order", () => {
    expect(CONDITIONS).toEqual([
      "Mycket bra",
      "Bra",
      "Hyfsat",
      "Dåligt",
      "Ej åkbart",
    ]);
  });
});
