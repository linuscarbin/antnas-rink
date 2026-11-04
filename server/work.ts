import { workedBy } from "@shared/jobs";
import * as db from "./db";
import { notifyTopicLater } from "./push";

const HOUR = 3600 * 1000;

type Who = { userId: number; name: string; helpers: string[]; photoUrl?: string };

const photo = (who: Who, at: Date) =>
  who.photoUrl ? { photoUrl: who.photoUrl, photoAt: at, photoBy: who.name } : {};

/**
 * Records rink work (plogad/spolad): effort for the leaderboard, the public
 * status card ("Plogad … av Kalle, Lisa och Olle") and the "nyspolad" push.
 */
export async function recordRinkWork(kind: "plogad" | "spolad", who: Who) {
  const now = new Date();
  const by = workedBy(who.name, who.helpers);
  await db.logEffort({
    kind,
    userId: who.userId,
    byName: who.name,
    helpers: who.helpers.length ? who.helpers.join(", ") : null,
  });
  if (kind === "spolad") {
    notifyTopicLater(
      "rink_spolad",
      { title: "Rinken är nyspolad 🧊", body: `${by} har spolat isen. Ta med skridskorna!`, url: "/" },
      { throttleMs: 3 * HOUR }
    );
    return db.updateRinkStatus({ spoladAt: now, spoladBy: by, ...photo(who, now) });
  }
  return db.updateRinkStatus({ plogadAt: now, plogadBy: by, ...photo(who, now) });
}

/** Records ski-track work (draget). */
export async function recordTrackWork(who: Who) {
  const now = new Date();
  const by = workedBy(who.name, who.helpers);
  await db.logEffort({
    kind: "draget",
    userId: who.userId,
    byName: who.name,
    helpers: who.helpers.length ? who.helpers.join(", ") : null,
  });
  notifyTopicLater(
    "track_draget",
    { title: "Spåret är nydraget ⛷️", body: `${by} har dragit skidspåret.`, url: "/skidspar" },
    { throttleMs: 3 * HOUR }
  );
  return db.updateTrackStatus({ dragetAt: now, dragetBy: by, ...photo(who, now) });
}
