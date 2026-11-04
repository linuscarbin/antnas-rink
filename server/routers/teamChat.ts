import { TRPCError } from "@trpc/server";
import { jourUrl } from "@shared/push";
import { displayName } from "@shared/user";
import { z } from "zod";
import * as db from "../db";
import { notifyTopicLater } from "../push";
import { chatTeamAccess, chatTeamsFor } from "../teamChat";
import { protectedProcedure, router } from "../_core/trpc";
import { ownImageUrl } from "./chat";

const area = z.enum(["hockeyrink", "skidspar"]);

async function requireAccess(user: { id: number; role: "user" | "admin" }, teamId: number) {
  const team = await chatTeamAccess(user, teamId);
  if (!team) throw new TRPCError({ code: "FORBIDDEN", message: "Du är inte med i det här laget." });
  return team;
}

export const teamChatRouter = router({
  // Team chats I can open in an area (own team first).
  teams: protectedProcedure.input(z.object({ area })).query(({ ctx, input }) => chatTeamsFor(ctx.user, input.area)),

  // Messages, oldest first. Job cards come with the job's live state.
  list: protectedProcedure
    .input(z.object({ teamId: z.number().int(), afterId: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      await requireAccess(ctx.user, input.teamId);
      const rows = await db.listTeamMessages(input.teamId, { afterId: input.afterId });
      const jobIds = Array.from(new Set(rows.filter((r) => r.kind === "job" && r.jobId).map((r) => r.jobId!)));
      const jobs = new Map(
        await Promise.all(
          jobIds.map(async (id) => {
            const job = await db.getDutyJob(id);
            const responses = job ? await db.listDutyJobResponses(id) : [];
            return [
              id,
              job && {
                id: job.id,
                kind: job.kind,
                startsAt: job.startsAt,
                endsAt: job.endsAt,
                note: job.note,
                status: job.status,
                createdByName: job.createdByName,
                mine: job.createdByUserId === ctx.user.id,
                yes: responses.filter((r) => r.answer === "yes").map((r) => r.name),
                no: responses.filter((r) => r.answer === "no").map((r) => r.name),
                myAnswer: responses.find((r) => r.userId === ctx.user.id)?.answer ?? null,
              },
            ] as const;
          })
        )
      );
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        name: r.name,
        body: r.body,
        photoUrl: r.photoUrl,
        createdAt: r.createdAt,
        mine: r.userId === ctx.user.id,
        canDelete: r.kind === "text" && (r.userId === ctx.user.id || ctx.user.role === "admin"),
        job: r.kind === "job" && r.jobId ? jobs.get(r.jobId) ?? null : null,
      }));
    }),

  send: protectedProcedure
    .input(
      z.object({
        teamId: z.number().int(),
        body: z.string().trim().max(1000),
        photoUrl: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const team = await requireAccess(ctx.user, input.teamId);
      const photoUrl = ownImageUrl(input.photoUrl);
      if (!input.body && !photoUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Skriv något eller välj ett foto." });
      }
      const name = displayName(ctx.user);
      const id = await db.addTeamMessage({
        teamId: team.id,
        kind: "text",
        userId: ctx.user.id,
        name,
        body: input.body,
        photoUrl,
      });

      // One notification per team chat on the phone: a new message replaces
      // the previous one (same tag). Not saved in the inbox – the chat is.
      const userIds = (await db.listTeamMembers(team.id))
        .map((m) => m.userId)
        .filter((u): u is number => u != null && u !== ctx.user.id);
      if (userIds.length) {
        notifyTopicLater(
          "duty_chat",
          {
            title: `${team.name} · ${name}`,
            body: input.body ? input.body.slice(0, 140) : "📷 Skickade ett foto",
            url: `${jourUrl(team.area)}&lag=${team.id}`,
            tag: `chat-${team.id}`,
          },
          { userIds: Array.from(new Set(userIds)), noInbox: true }
        );
      }
      return { id };
    }),

  // Own message (or any, for admins).
  delete: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const msg = await db.getTeamMessage(input.id);
    if (!msg) return { success: true } as const;
    if (msg.kind !== "text" || (msg.userId !== ctx.user.id && ctx.user.role !== "admin")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Du kan bara ta bort dina egna meddelanden." });
    }
    await db.deleteTeamMessage(msg.id);
    return { success: true } as const;
  }),
});
