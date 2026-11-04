import { TRPCError } from "@trpc/server";
import { displayName } from "@shared/user";
import { z } from "zod";
import * as db from "../db";
import { emailLayout, esc, sendEmail } from "../email";
import { canSeeContactDetails, isFunctionaryFor } from "../_core/functionary";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { notifyTopicLater } from "../push";

const area = z.enum(["hockeyrink", "skidspar"]);
const AREA_TEXT = {
  hockeyrink: { jour: "rinkjouren", url: "/schema" },
  skidspar: { jour: "spårjouren", url: "/skidspar" },
} as const;

export const dutyTeamsRouter = router({
  // Public: an area's teams + member names. Phones only for functionaries/admins.
  list: publicProcedure.input(z.object({ area })).query(async ({ ctx, input }) => {
    const showPhone = await canSeeContactDetails(ctx.user);
    const teams = await db.listRinkTeams(input.area);
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      members: t.members.map((m) => ({
        id: m.id,
        name: m.name,
        phone: showPhone ? m.phone : null,
        linked: m.userId != null,
        isMe: ctx.user != null && m.userId === ctx.user.id,
      })),
    }));
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80), area }))
    .mutation(async ({ input }) => ({ id: await db.createRinkTeam(input.name, input.area) })),

  rename: adminProcedure
    .input(z.object({ id: z.number().int(), name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ input }) => {
      await db.renameRinkTeam(input.id, input.name);
      return { success: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteRinkTeam(input.id);
      return { success: true } as const;
    }),

  // Admin: add a member — either a registered user or just name + phone.
  addMember: adminProcedure
    .input(
      z.object({
        teamId: z.number().int(),
        userId: z.number().int().nullable().optional(),
        name: z.string().trim().max(120).optional(),
        phone: z.string().trim().max(40).optional(),
      })
    )
    .mutation(async ({ input }) => {
      let name = input.name ?? "";
      let phone = input.phone || null;
      if (input.userId) {
        const u = await db.getUserById(input.userId);
        if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "Användaren finns inte." });
        name = name || displayName(u);
        phone = phone || u.phone || null;
      }
      if (!name) throw new TRPCError({ code: "BAD_REQUEST", message: "Ange ett namn." });
      const id = await db.addRinkTeamMember({
        teamId: input.teamId,
        userId: input.userId ?? null,
        name,
        phone,
      });
      return { id };
    }),

  removeMember: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.removeRinkTeamMember(input.id);
      return { success: true } as const;
    }),

  // Public: who has "förhinder" which week (messages only for functionaries).
  absences: publicProcedure
    .input(z.object({ year: z.number().int(), area }))
    .query(async ({ ctx, input }) => {
      const showMsg = await isFunctionaryFor(ctx.user, input.area);
      const memberIds = new Set(
        (await db.listRinkTeams(input.area)).flatMap((t) => t.members.map((m) => m.id))
      );
      const rows = (await db.listAbsences(input.year)).filter((a) => memberIds.has(a.memberId));
      return rows.map((a) => ({
        year: a.year,
        week: a.week,
        memberId: a.memberId,
        message: showMsg ? a.message : null,
      }));
    }),

  // Team member (or admin): "Jag kan inte den här veckan" / undo.
  setAbsence: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        week: z.number().int().min(1).max(53),
        memberId: z.number().int(),
        absent: z.boolean(),
        message: z.string().trim().max(300).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await db.getRinkTeamMember(input.memberId);
      const team = member ? await db.getRinkTeam(member.teamId) : undefined;
      const duty = team ? await db.getAreaDuty(team.area, input.year, input.week) : undefined;
      if (!member || !team || !duty || duty.teamId !== member.teamId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Laget har inte jour den veckan." });
      }
      if (member.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Du kan bara anmäla förhinder för dig själv." });
      }
      await db.setAbsence(input.year, input.week, member.id, input.absent, input.message || null);

      if (input.absent) {
        const t = AREA_TEXT[team.area];
        const members = await db.listTeamMembers(team.id);
        const text = `${member.name} (${team.name}) kan inte ${t.jour} vecka ${input.week}.`;
        const admins = await db.listAdmins();
        await sendEmail({
          to: admins.map((a) => a.email).filter((e): e is string => Boolean(e)),
          subject: `Förhinder: ${t.jour} vecka ${input.week}`,
          html: emailLayout(
            `Förhinder i ${t.jour}`,
            `<p>${esc(text)}</p>${input.message ? `<p>Meddelande: ${esc(input.message)}</p>` : ""}`
          ),
        });
        const userIds = [
          ...admins.map((a) => a.id),
          ...members.map((m) => m.userId).filter((u): u is number => u != null),
        ].filter((id) => id !== ctx.user.id);
        notifyTopicLater(
          "duty_conflict",
          { title: `Förhinder i ${t.jour} ⚠️`, body: text, url: t.url },
          { userIds: Array.from(new Set(userIds)) }
        );
      }
      return { success: true } as const;
    }),
});
