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
  hockeyrink: { jour: "rinkjouren", url: "/?flik=jour" },
  skidspar: { jour: "spårjouren", url: "/skidspar?flik=jour" },
} as const;

/** "Kalles", but "Lars" (names ending in s/x/z get no extra s). */
const genitive = (name: string) => (/[sxz]$/i.test(name.trim()) ? name.trim() : `${name.trim()}s`);

/**
 * People who should hear about a förhinder in a team: admins, the team's
 * members and any extra ids (e.g. the stand-in) – minus the one acting.
 */
async function absenceAudience(teamId: number, exceptUserId: number, extra: (number | null | undefined)[] = []) {
  const admins = await db.listAdmins();
  const members = await db.listTeamMembers(teamId);
  const ids = [
    ...admins.map((a) => a.id),
    ...members.map((m) => m.userId),
    ...extra,
  ].filter((id): id is number => id != null && id !== exceptUserId);
  return Array.from(new Set(ids));
}

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
      // New functionaries don't need "ett gäng är på väg" (they can turn it on again).
      if (input.userId) await db.removeTopicForUser(input.userId, "group");
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
        coveredByName: a.coveredByName,
        coveredByMe: ctx.user != null && a.coveredByUserId === ctx.user.id,
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
      const before = await db.getAbsence(input.year, input.week, member.id);
      if (input.absent && before) return { success: true } as const; // already reported
      await db.setAbsence(input.year, input.week, member.id, input.absent, input.message || null);

      // Withdrawn: tell those who were told about it that it's sorted.
      if (!input.absent && before) {
        const t = AREA_TEXT[team.area];
        const standIn = before.coveredByName ? ` ${before.coveredByName} behöver inte hoppa in.` : "";
        notifyTopicLater(
          "duty_conflict",
          {
            title: "Förhinder borttaget ✅",
            body: `${member.name} kan ändå ta ${t.jour} vecka ${input.week}.${standIn}`,
            url: t.url,
          },
          { userIds: await absenceAudience(team.id, ctx.user.id, [member.userId, before.coveredByUserId]) }
        );
      }

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

  // Any functionary for the area (or admin): "Jag tar det" – stand in for a
  // förhinder, or undo it. Tells the absent person, the team and admins.
  coverAbsence: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        week: z.number().int().min(1).max(53),
        memberId: z.number().int(),
        cover: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const absence = await db.getAbsence(input.year, input.week, input.memberId);
      const member = absence ? await db.getRinkTeamMember(absence.memberId) : undefined;
      const team = member ? await db.getRinkTeam(member.teamId) : undefined;
      if (!absence || !member || !team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Förhindret finns inte längre." });
      }
      if (!(await isFunctionaryFor(ctx.user, team.area))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Bara jourhavare kan hoppa in." });
      }
      const t = AREA_TEXT[team.area];
      const me = displayName(ctx.user);

      if (input.cover) {
        if (member.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Du kan inte ersätta dig själv – ta bort förhindret i stället." });
        }
        if (absence.coveredByUserId && absence.coveredByUserId !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: `${absence.coveredByName} har redan tagit det.` });
        }
        if (absence.coveredByUserId === ctx.user.id) return { success: true } as const;
        await db.setAbsenceCover(absence.id, { userId: ctx.user.id, name: me });
        notifyTopicLater(
          "duty_conflict",
          {
            title: "Förhinder löst ✅",
            body: `${me} tar ${genitive(member.name)} pass i ${t.jour} vecka ${input.week}.`,
            url: t.url,
          },
          { userIds: await absenceAudience(team.id, ctx.user.id, [member.userId]) }
        );
        return { success: true } as const;
      }

      // Undo: only the stand-in or an admin.
      if (!absence.coveredByUserId) return { success: true } as const;
      if (absence.coveredByUserId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Bara den som hoppade in kan ångra." });
      }
      const who = absence.coveredByName ?? me;
      await db.setAbsenceCover(absence.id, null);
      notifyTopicLater(
        "duty_conflict",
        {
          title: `Förhinder i ${t.jour} ⚠️`,
          body: `${who} kan inte ta ${genitive(member.name)} pass vecka ${input.week} ändå – ersättare behövs.`,
          url: t.url,
        },
        { userIds: await absenceAudience(team.id, ctx.user.id, [member.userId, absence.coveredByUserId]) }
      );
      return { success: true } as const;
    }),
});
