import { TRPCError } from "@trpc/server";
import { displayName } from "@shared/user";
import { z } from "zod";
import { getIsoWeek } from "@shared/rink";
import { formatJobWindow, JOB_KIND_LABEL, JOB_KINDS } from "@shared/jobs";
import * as db from "../db";
import { assertFunctionary, functionaryAreas } from "../_core/functionary";
import { protectedProcedure, router } from "../_core/trpc";
import { jourUrl } from "@shared/push";
import { notifyTopicLater } from "../push";
import { jobLine, postJobCard, postJobEvent } from "../teamChat";
import { DONE_TEXT } from "../jobSync";
import { recordRinkWork, recordTrackWork } from "../work";

const area = z.enum(["hockeyrink", "skidspar"]);
const HOUR = 3600 * 1000;



/** Team members a job concerns: the proposer's team, else the week's team. */
async function jobTeamMembers(job: { teamId: number | null; area: "hockeyrink" | "skidspar"; startsAt: Date }) {
  let teamId = job.teamId;
  if (!teamId) {
    const { year, week } = getIsoWeek(new Date(job.startsAt));
    teamId = (await db.getAreaDuty(job.area, year, week))?.teamId ?? null;
  }
  return teamId ? db.listTeamMembers(teamId) : [];
}

const jobText = (j: { kind: (typeof JOB_KINDS)[number]; startsAt: Date; endsAt: Date }) =>
  `${JOB_KIND_LABEL[j.kind].toLowerCase()} ${formatJobWindow(new Date(j.startsAt), new Date(j.endsAt))}`;

function validateWindow(startsAt: number, endsAt: number) {
  const now = Date.now();
  if (endsAt <= startsAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Sluttiden måste vara efter starttiden." });
  }
  if (endsAt - startsAt > 12 * HOUR) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ett jobb kan vara max 12 timmar." });
  }
  if (endsAt < now || startsAt > now + 14 * 24 * HOUR) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Välj en tid inom de närmaste två veckorna." });
  }
}

export const jobsRouter = router({
  // Functionaries: upcoming jobs in their areas with who said yes/no and who
  // in the team hasn't answered yet.
  list: protectedProcedure.query(async ({ ctx }) => {
    const areas = await functionaryAreas(ctx.user);
    const list = await db.listDutyJobs(
      (["hockeyrink", "skidspar"] as const).filter((a) => areas[a])
    );
    const isAdmin = ctx.user.role === "admin";
    return Promise.all(
      list.map(async (j) => {
        const members = await jobTeamMembers(j);
        const answered = new Set(j.responses.map((r) => r.userId));
        return {
          id: j.id,
          area: j.area,
          kind: j.kind,
          startsAt: j.startsAt,
          endsAt: j.endsAt,
          note: j.note,
          status: j.status,
          createdByName: j.createdByName,
          mine: j.createdByUserId === ctx.user.id,
          canManage: isAdmin || j.createdByUserId === ctx.user.id,
          myAnswer: j.responses.find((r) => r.userId === ctx.user.id)?.answer ?? null,
          yes: j.responses.filter((r) => r.answer === "yes").map((r) => r.name),
          no: j.responses.filter((r) => r.answer === "no").map((r) => r.name),
          pending: members
            .filter((m) => m.userId !== j.createdByUserId && !(m.userId && answered.has(m.userId)))
            .map((m) => m.name),
        };
      })
    );
  }),

  // Functionary: "Jag kan ploga ikväll 18–20" → notifies the team.
  create: protectedProcedure
    .input(
      z.object({
        area,
        kind: z.enum(JOB_KINDS),
        startsAt: z.number().int(),
        endsAt: z.number().int(),
        note: z.string().trim().max(300).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, input.area);
      validateWindow(input.startsAt, input.endsAt);
      const name = displayName(ctx.user);
      const teamId = (await db.teamIdsForUser(ctx.user.id, input.area))[0] ?? null;
      const job = {
        area: input.area,
        kind: input.kind,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        note: input.note || null,
        teamId,
        createdByUserId: ctx.user.id,
        createdByName: name,
      };
      const id = await db.createDutyJob(job);
      await postJobCard(id, job, { userId: ctx.user.id, name });

      const userIds = (await jobTeamMembers(job))
        .map((m) => m.userId)
        .filter((u): u is number => u != null && u !== ctx.user.id);
      if (userIds.length) {
        notifyTopicLater(
          "duty_jobs",
          {
            title: `${name} kan ${jobText(job)}`,
            body: `${input.note ? `${input.note} – ` : ""}Kan du hänga med? Svara i appen.`,
            url: jourUrl(job.area),
            tag: `job-${id}`,
          },
          { userIds: Array.from(new Set(userIds)) }
        );
      }
      return { id };
    }),

  // Functionary: answer yes/no (null = take back the answer).
  respond: protectedProcedure
    .input(z.object({ id: z.number().int(), answer: z.enum(["yes", "no"]).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const job = await db.getDutyJob(input.id);
      if (!job || job.status === "cancelled") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jobbet finns inte längre." });
      }
      await assertFunctionary(ctx.user, job.area);
      const name = displayName(ctx.user);
      const before = (await db.listDutyJobResponses(job.id)).find((r) => r.userId === ctx.user.id)?.answer ?? null;
      await db.setDutyJobResponse(job.id, ctx.user.id, name, input.answer);
      if (input.answer !== before && input.answer && job.createdByUserId !== ctx.user.id) {
        await postJobEvent(job, { userId: ctx.user.id, name }, input.answer === "yes" ? `${name} hänger med 👍` : `${name} kan inte`);
      }
      if (input.answer === "yes" && job.createdByUserId !== ctx.user.id) {
        notifyTopicLater(
          "duty_jobs",
          { title: `${name} kan också ✅`, body: `Till ${jobText(job)}.`, url: jourUrl(job.area), tag: `job-${job.id}` },
          { userIds: [job.createdByUserId] }
        );
      }
      return { success: true } as const;
    }),

  // Proposer or admin: mark done, cancel, or reopen.
  setStatus: protectedProcedure
    .input(z.object({ id: z.number().int(), status: z.enum(["open", "done", "cancelled"]) }))
    .mutation(async ({ ctx, input }) => {
      const job = await db.getDutyJob(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Jobbet finns inte." });
      if (ctx.user.role !== "admin" && job.createdByUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Bara den som föreslog jobbet kan ändra det." });
      }
      const responses = await db.listDutyJobResponses(job.id);
      if (input.status === "done" && job.status !== "done") {
        // Sync with the status card: "Plogad … av Kalle, Lisa och Olle".
        const who = {
          userId: job.createdByUserId,
          name: job.createdByName,
          helpers: responses
            .filter((r) => r.answer === "yes" && r.userId !== job.createdByUserId)
            .map((r) => r.name),
        };
        if (job.kind === "plog" || job.kind === "plog_spol") await recordRinkWork("plogad", who);
        if (job.kind === "spol" || job.kind === "plog_spol") await recordRinkWork("spolad", who);
        if (job.kind === "spar") await recordTrackWork(who);
      }
      await db.setDutyJobStatus(job.id, input.status);
      if (input.status !== job.status) {
        const by = { userId: ctx.user.id, name: displayName(ctx.user) };
        if (input.status === "done") await postJobEvent(job, by, DONE_TEXT[job.kind]);
        if (input.status === "cancelled") await postJobEvent(job, by, `Inställt: ${jobLine(job)}`);
        if (input.status === "open") await postJobEvent(job, by, `Öppnat igen: ${jobLine(job)}`);
      }
      if (input.status === "cancelled") {
        const yesIds = responses
          .filter((r) => r.answer === "yes" && r.userId !== ctx.user.id)
          .map((r) => r.userId);
        if (yesIds.length) {
          notifyTopicLater(
            "duty_jobs",
            { title: "Jobb inställt", body: `${job.createdByName} har ställt in: ${jobText(job)}.`, url: jourUrl(job.area), tag: `job-${job.id}` },
            { userIds: yesIds }
          );
        }
      }
      return { success: true } as const;
    }),

  // Proposer (or admin): change time, kind or note. Those who said yes are told.
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        kind: z.enum(JOB_KINDS),
        startsAt: z.number().int(),
        endsAt: z.number().int(),
        note: z.string().trim().max(300).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const job = await db.getDutyJob(input.id);
      if (!job || job.status !== "open") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jobbet går inte att ändra längre." });
      }
      if (ctx.user.role !== "admin" && job.createdByUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Bara den som föreslog jobbet kan ändra det." });
      }
      validateWindow(input.startsAt, input.endsAt);
      const updated = {
        kind: input.kind,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        note: input.note || null,
      };
      await db.updateDutyJob(job.id, updated);
      const timeChanged =
        updated.startsAt.getTime() !== new Date(job.startsAt).getTime() ||
        updated.endsAt.getTime() !== new Date(job.endsAt).getTime() ||
        updated.kind !== job.kind;
      if (timeChanged) {
        await postJobEvent(
          { ...job, ...updated },
          { userId: ctx.user.id, name: displayName(ctx.user) },
          `Ändrat till: ${jobLine(updated)}`
        );
        const yesIds = (await db.listDutyJobResponses(job.id))
          .filter((r) => r.answer === "yes" && r.userId !== ctx.user.id)
          .map((r) => r.userId);
        if (yesIds.length) {
          notifyTopicLater(
            "duty_jobs",
            { title: "Ändrat jobb", body: `${job.createdByName} har ändrat till: ${jobText(updated)}.`, url: jourUrl(job.area), tag: `job-${job.id}` },
            { userIds: yesIds }
          );
        }
      }
      return { success: true } as const;
    }),
});
