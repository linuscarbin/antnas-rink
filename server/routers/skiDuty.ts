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

const skiDutyInput = z.object({
  year: z.number().int().min(2024).max(2100),
  week: z.number().int().min(1).max(53),
  sparjourName: z.string().max(120).optional().nullable(),
  sparjourPhone: z.string().max(40).optional().nullable(),
  sparjourUserId: z.number().int().optional().nullable(),
  teamId: z.number().int().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const skiDutyRouter = router({
  // Public: view the ski-track duty schedule.
  list: publicProcedure
    .input(z.object({ year: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      return db.listSkiDuties(input?.year);
    }),

  // Admin: create or update a week's ski duty.
  upsert: adminProcedure.input(skiDutyInput).mutation(async ({ input }) => {
    return db.upsertSkiDuty({ ...input, sparjourConflict: false });
  }),

  // Admin: assign spårjour teams in rotation over a range of weeks.
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
        const existing = await db.getSkiDuty(p.year, p.week);
        await db.upsertSkiDuty({ year: p.year, week: p.week, teamId: p.teamId, note: existing?.note ?? null });
      }
      return { weeks: plan.length };
    }),

  // Admin: delete a week's ski duty.
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteSkiDuty(input.id);
      return { success: true } as const;
    }),

  // Logged-in: flag a conflict (only the assigned spårjour or an admin).
  flagConflict: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        conflict: z.boolean(),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const duty = await db.getSkiDutyById(input.id);
      if (!duty) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jour hittades inte." });
      }
      const isAssigned = duty.sparjourUserId === ctx.user.id;
      const isAdmin = ctx.user.role === "admin";
      if (!isAssigned && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Endast tilldelad spårjour eller admin kan flagga förhinder.",
        });
      }

      const updated = await db.setSkiDutyConflict(input.id, input.conflict);

      if (input.conflict && updated) {
        const reporter = ctx.user.name || ctx.user.email || "En användare";
        const admins = await db.listAdmins();
        const adminEmails = admins
          .map((a) => a.email)
          .filter((e): e is string => Boolean(e));
        const body = `
          <p><strong>${esc(reporter)}</strong> har anmält förhinder för sin spårjour (skidspåret).</p>
          <p>Vecka ${updated.week}, ${updated.year}.</p>
          ${input.message ? `<p>Meddelande: ${esc(input.message)}</p>` : ""}
          <p>Logga in i adminpanelen för att hitta en ersättare.</p>
        `;
        notifyConflict("skidspar", `Spårjour vecka ${updated.week}: ${reporter} har förhinder och behöver ersättare.`);
        await sendEmail({
          to: adminEmails,
          subject: `Förhinder anmält: Spårjour vecka ${updated.week}`,
          html: emailLayout("Förhinder på spårjour", body),
        });
      }

      return updated;
    }),
});
