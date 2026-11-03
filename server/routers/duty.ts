import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { rotateTeams } from "@shared/rink";
import { emailLayout, esc, sendEmail } from "../email";
import { notifyConflict } from "../push";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

const dutyInput = z.object({
  year: z.number().int().min(2024).max(2100),
  week: z.number().int().min(1).max(53),
  plogjourName: z.string().max(120).optional().nullable(),
  plogjourPhone: z.string().max(40).optional().nullable(),
  plogjourUserId: z.number().int().optional().nullable(),
  spoljourName: z.string().max(120).optional().nullable(),
  spoljourPhone: z.string().max(40).optional().nullable(),
  spoljourUserId: z.number().int().optional().nullable(),
  teamId: z.number().int().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const dutyRouter = router({
  // Public: anyone can view the duty schedule.
  list: publicProcedure
    .input(z.object({ year: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      return db.listDuties(input?.year);
    }),

  // Admin: create or update a week's duty assignment.
  upsert: adminProcedure.input(dutyInput).mutation(async ({ input }) => {
    return db.upsertDuty({
      ...input,
      plogjourConflict: false,
      spoljourConflict: false,
    });
  }),

  // Admin: assign teams in rotation over a range of weeks (across new year).
  rotate: adminProcedure
    .input(
      z.object({
        from: z.object({ year: z.number().int(), week: z.number().int().min(1).max(53) }),
        to: z.object({ year: z.number().int(), week: z.number().int().min(1).max(53) }),
        teamIds: z.array(z.number().int()).min(1).max(20),
        startIndex: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ input }) => {
      const plan = rotateTeams(input.from, input.to, input.teamIds, input.startIndex);
      if (!plan.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Slutveckan måste vara efter startveckan." });
      }
      for (const p of plan) {
        const existing = await db.getDuty(p.year, p.week);
        await db.upsertDuty({
          year: p.year,
          week: p.week,
          teamId: p.teamId,
          note: existing?.note ?? null,
        });
      }
      return { weeks: plan.length };
    }),

  // Admin: delete a week's duty row.
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteDuty(input.id);
      return { success: true } as const;
    }),

  // Logged-in: flag a conflict on a duty you are assigned to.
  // Notifies all admins by email.
  flagConflict: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        kind: z.enum(["plogjour", "spoljour"]),
        conflict: z.boolean(),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const duty = await db.getDutyById(input.id);
      if (!duty) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jour hittades inte." });
      }
      const assignedUserId =
        input.kind === "plogjour" ? duty.plogjourUserId : duty.spoljourUserId;
      const isAssigned = assignedUserId === ctx.user.id;
      const isAdmin = ctx.user.role === "admin";
      if (!isAssigned && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Endast tilldelad jour eller admin kan flagga förhinder.",
        });
      }

      const updated = await db.setDutyConflict(
        input.id,
        input.kind,
        input.conflict
      );

      if (input.conflict && updated) {
        const reporter = ctx.user.name || ctx.user.email || "En användare";
        const kindLabel = input.kind === "plogjour" ? "Plogjour" : "Spoljour";
        const admins = await db.listAdmins();
        const adminEmails = admins
          .map((a) => a.email)
          .filter((e): e is string => Boolean(e));

        const body = `
          <p><strong>${esc(reporter)}</strong> har anmält förhinder för sin ${kindLabel.toLowerCase()}.</p>
          <p>Vecka ${updated.week}, ${updated.year}.</p>
          ${input.message ? `<p>Meddelande: ${esc(input.message)}</p>` : ""}
          <p>Logga in i adminpanelen för att hitta en ersättare.</p>
        `;

        notifyConflict("hockeyrink", `${kindLabel} vecka ${updated.week}: ${reporter} har förhinder och behöver ersättare.`);
        await sendEmail({
          to: adminEmails,
          subject: `Förhinder anmält: ${kindLabel} vecka ${updated.week}`,
          html: emailLayout("Förhinder på jour", body),
        });
      }

      return updated;
    }),
});
