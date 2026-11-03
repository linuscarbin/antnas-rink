// Pure "is it skateable / skiable?" logic shared by client (and tests).

export type VerdictLevel = "green" | "yellow" | "red" | "unknown";

export type Verdict = {
  level: VerdictLevel;
  /** Short headline, e.g. "Åkbar". */
  title: string;
  /** One-line explanation. */
  detail: string;
};

const HOUR = 3600 * 1000;

function ageMs(at: Date | string | null | undefined, now: number): number | null {
  if (!at) return null;
  const t = new Date(at).getTime();
  return Number.isFinite(t) ? Math.max(0, now - t) : null;
}

/**
 * Rink verdict.
 * - Closed by a functionary → red.
 * - Plowed or flooded within 36h → green (yellow if it's thawing).
 * - Taken care of within 7 days → yellow (may have snow on it).
 * - Otherwise → unknown (nobody has reported for a while).
 */
export function rinkVerdict(input: {
  closedMessage?: string | null;
  plogadAt?: Date | string | null;
  spoladAt?: Date | string | null;
  temperature?: number | null;
  now?: number;
}): Verdict {
  const now = input.now ?? Date.now();
  if (input.closedMessage && input.closedMessage.trim()) {
    return { level: "red", title: "Stängd", detail: input.closedMessage.trim() };
  }
  const ages = [ageMs(input.plogadAt, now), ageMs(input.spoladAt, now)].filter(
    (a): a is number => a !== null
  );
  const latest = ages.length ? Math.min(...ages) : null;
  const thawing = typeof input.temperature === "number" && input.temperature > 1;

  if (latest !== null && latest <= 36 * HOUR) {
    if (thawing) {
      return {
        level: "yellow",
        title: "Åkbar, men plusgrader",
        detail: "Isen kan vara mjuk eller blöt.",
      };
    }
    return {
      level: "green",
      title: "Åkbar",
      detail: "Rinken är skött det senaste dygnet. Ta med skridskorna!",
    };
  }
  if (latest !== null && latest <= 7 * 24 * HOUR) {
    return {
      level: "yellow",
      title: "Troligen åkbar",
      detail: thawing
        ? "Inte skött på ett tag och plusgrader – kan vara snö eller mjuk is."
        : "Inte plogad det senaste dygnet – det kan ligga snö på isen.",
    };
  }
  return {
    level: "unknown",
    title: "Okänt",
    detail: "Ingen har rapporterat på ett tag. Kolla gärna anslagstavlan.",
  };
}

/** Ski-track verdict from condition + when it was last groomed. */
export function trackVerdict(input: {
  condition?: string | null;
  dragetAt?: Date | string | null;
  now?: number;
}): Verdict {
  const now = input.now ?? Date.now();
  const age = ageMs(input.dragetAt, now);
  const c = input.condition ?? null;
  if (c === "Ej åkbart") {
    return { level: "red", title: "Ej åkbart", detail: "Spåret går inte att åka just nu." };
  }
  const fresh = age !== null && age <= 48 * HOUR;
  if (c === "Mycket bra" || c === "Bra") {
    return {
      level: fresh ? "green" : "yellow",
      title: fresh ? "Fina spår" : "Åkbart",
      detail: fresh ? `Spårskick: ${c}. Nyligen draget.` : `Spårskick: ${c}. Inte draget senaste dygnen.`,
    };
  }
  if (c === "Hyfsat" || c === "Dåligt") {
    return { level: "yellow", title: "Åkbart", detail: `Spårskick: ${c}.` };
  }
  if (fresh) {
    return { level: "green", title: "Nyligen draget", detail: "Spårskick ej bedömt." };
  }
  return { level: "unknown", title: "Okänt", detail: "Spåret har inte bedömts på ett tag." };
}
