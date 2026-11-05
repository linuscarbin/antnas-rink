import type { JobKind } from "@shared/jobs";
import * as db from "./db";
import { postJobEvent } from "./teamChat";

type Area = "hockeyrink" | "skidspar";

export const DONE_TEXT: Record<JobKind, string> = {
  plog: "Klart – plogat ✅",
  spol: "Klart – spolat ✅",
  plog_spol: "Klart – plogat och spolat ✅",
  spar: "Klart – spåret draget ✅",
  annat: "Klart ✅",
};

/** Which planned jobs a manual marking completes ("plogad" alone doesn't finish plog+spol). */
const CLOSES: Record<"plogad" | "spolad" | "draget", JobKind[]> = {
  plogad: ["plog"],
  spolad: ["spol", "plog_spol"],
  draget: ["spar"],
};

const MARGIN_MS = 3 * 3600 * 1000;

/**
 * Status marked by hand ("Plogad nu" on the overview): planned jobs of that
 * kind around now are done too, so "Planera jobb" and the team chat don't
 * keep showing them as planned. The work itself is already recorded, so
 * this only flips the job status. Never throws.
 */
export async function closeJobsForManualWork(
  area: Area,
  done: "plogad" | "spolad" | "draget",
  by: { userId: number; name: string }
) {
  try {
    const now = Date.now();
    const jobs = (await db.listDutyJobs([area])).filter(
      (j) =>
        j.status === "open" &&
        CLOSES[done].includes(j.kind) &&
        new Date(j.startsAt).getTime() - MARGIN_MS <= now &&
        now <= new Date(j.endsAt).getTime() + MARGIN_MS
    );
    for (const j of jobs) {
      await db.setDutyJobStatus(j.id, "done");
      await postJobEvent(j, { userId: by.userId, name: by.name }, `${DONE_TEXT[j.kind]} (markerat av ${by.name})`);
    }
    return jobs.length;
  } catch (e) {
    console.warn("[Jobs] manual sync failed:", e);
    return 0;
  }
}
