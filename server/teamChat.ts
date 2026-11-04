import { getIsoWeek } from "@shared/rink";
import { JOB_KIND_LABEL, formatJobWindow, type JobKind } from "@shared/jobs";
import * as db from "./db";

type Area = "hockeyrink" | "skidspar";
type Viewer = { id: number; role: "user" | "admin" };

export type ChatTeam = { id: number; name: string; area: Area; onDuty: boolean; isMember: boolean };

/**
 * Team chats a user can open in an area: their own team(s), teams they
 * stand in for this week or next ("Jag tar det"), and – for admins – all.
 */
export async function chatTeamsFor(user: Viewer, area: Area): Promise<ChatTeam[]> {
  const teams = await db.listRinkTeams(area);
  const now = getIsoWeek(new Date());
  const next = getIsoWeek(new Date(Date.now() + 7 * 86400_000));
  const duty = await db.getAreaDuty(area, now.year, now.week);

  const own = new Set(await db.teamIdsForUser(user.id, area));
  const standIn = new Set<number>();
  for (const a of await db.coveredAbsencesForUser(user.id)) {
    const isSoon = (a.year === now.year && a.week === now.week) || (a.year === next.year && a.week === next.week);
    if (!isSoon) continue;
    const team = teams.find((t) => t.members.some((m) => m.id === a.memberId));
    if (team) standIn.add(team.id);
  }

  return teams
    .filter((t) => user.role === "admin" || own.has(t.id) || standIn.has(t.id))
    .map((t) => ({
      id: t.id,
      name: t.name,
      area,
      onDuty: duty?.teamId === t.id,
      isMember: own.has(t.id),
    }))
    .sort((a, b) => Number(b.isMember) - Number(a.isMember) || Number(b.onDuty) - Number(a.onDuty));
}

/** The chat team for a team id, if the user may read and write in it. */
export async function chatTeamAccess(user: Viewer, teamId: number): Promise<ChatTeam | null> {
  const team = await db.getRinkTeam(teamId);
  if (!team) return null;
  const list = await chatTeamsFor(user, team.area);
  return list.find((t) => t.id === teamId) ?? null;
}

/** The team whose chat a job belongs in: the proposer's, else the week's. */
export async function jobChatTeamId(job: { teamId: number | null; area: Area; startsAt: Date }) {
  if (job.teamId) return job.teamId;
  const { year, week } = getIsoWeek(new Date(job.startsAt));
  return (await db.getAreaDuty(job.area, year, week))?.teamId ?? null;
}

const jobLine = (j: { kind: JobKind; startsAt: Date; endsAt: Date }) =>
  `${JOB_KIND_LABEL[j.kind]} ${formatJobWindow(new Date(j.startsAt), new Date(j.endsAt))}`;

/** Puts a new job in the team chat as a card. Never throws. */
export async function postJobCard(
  jobId: number,
  job: { teamId: number | null; area: Area; kind: JobKind; startsAt: Date; endsAt: Date; note: string | null },
  by: { userId: number; name: string }
) {
  try {
    const teamId = await jobChatTeamId(job);
    if (!teamId) return;
    await db.addTeamMessage({
      teamId,
      kind: "job",
      userId: by.userId,
      name: by.name,
      body: job.note ?? "",
      jobId,
    });
  } catch (e) {
    console.warn("[Chat] job card failed:", e);
  }
}

/** A small line under a job in the chat ("Lisa hänger med ✅"). Never throws. */
export async function postJobEvent(
  job: { id: number; teamId: number | null; area: Area; kind: JobKind; startsAt: Date; endsAt: Date },
  by: { userId: number | null; name: string },
  text: string
) {
  try {
    const teamId = await jobChatTeamId(job);
    if (!teamId) return;
    await db.addTeamMessage({ teamId, kind: "event", userId: by.userId, name: by.name, body: text, jobId: job.id });
  } catch (e) {
    console.warn("[Chat] job event failed:", e);
  }
}

export { jobLine };
