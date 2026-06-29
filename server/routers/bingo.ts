import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { distributeShifts } from "@shared/bingo";
import * as db from "../db";
import {
  adminProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

function parseUnavailable(csv: string | null): number[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

export const bingoRouter = router({
  /* ----- Occasions ----- */
  listOccasions: publicProcedure
    .input(z.object({ season: z.number().int().optional() }).optional())
    .query(async ({ input }) => db.listOccasions(input?.season)),

  createOccasion: adminProcedure
    .input(
      z.object({
        season: z.number().int(),
        occasionDate: z.number().int(),
        location: z.string().max(200).optional(),
        targetCount: z.number().int().min(1).max(200).default(20),
        leadName: z.string().max(120).optional(),
        leadPhone: z.string().max(40).optional(),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) =>
      db.createOccasion({
        season: input.season,
        occasionDate: new Date(input.occasionDate),
        location: input.location || null,
        targetCount: input.targetCount,
        leadName: input.leadName || null,
        leadPhone: input.leadPhone || null,
        note: input.note || null,
      })
    ),

  updateOccasion: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        occasionDate: z.number().int().optional(),
        location: z.string().max(200).nullable().optional(),
        targetCount: z.number().int().min(1).max(200).optional(),
        leadName: z.string().max(120).nullable().optional(),
        leadPhone: z.string().max(40).nullable().optional(),
        note: z.string().max(500).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, occasionDate, ...rest } = input;
      return db.updateOccasion(id, {
        ...rest,
        ...(occasionDate ? { occasionDate: new Date(occasionDate) } : {}),
      });
    }),

  deleteOccasion: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteOccasion(input.id);
      return { success: true } as const;
    }),

  /* ----- Teams ----- */
  listTeams: publicProcedure.query(async () => db.listTeams()),

  createTeam: adminProcedure
    .input(z.object({ name: z.string().min(1).max(160) }))
    .mutation(async ({ input }) =>
      db.createTeam({ name: input.name, shareToken: nanoid(24) })
    ),

  updateTeam: adminProcedure
    .input(z.object({ id: z.number().int(), name: z.string().min(1).max(160) }))
    .mutation(async ({ input }) => {
      await db.updateTeam(input.id, input.name);
      return { success: true } as const;
    }),

  deleteTeam: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteTeam(input.id);
      return { success: true } as const;
    }),

  /* ----- Team self-service via share token ----- */
  // Public: a team leader opens their link; returns team + its families.
  teamByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const team = await db.getTeamByToken(input.token);
      if (!team) throw new TRPCError({ code: "NOT_FOUND" });
      const fams = await db.listFamilies(team.id);
      return { team, families: fams };
    }),

  addFamily: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        parentName: z.string().min(1).max(160),
        phone: z.string().max(40).optional(),
        email: z.string().max(320).optional(),
        activeCount: z.number().int().min(1).max(20).default(1),
      })
    )
    .mutation(async ({ input }) => {
      const team = await db.getTeamByToken(input.token);
      if (!team) throw new TRPCError({ code: "NOT_FOUND" });
      return db.createFamily({
        teamId: team.id,
        parentName: input.parentName,
        phone: input.phone || null,
        email: input.email || null,
        activeCount: input.activeCount,
      });
    }),

  updateFamilyByToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        id: z.number().int(),
        parentName: z.string().min(1).max(160).optional(),
        phone: z.string().max(40).nullable().optional(),
        email: z.string().max(320).nullable().optional(),
        activeCount: z.number().int().min(1).max(20).optional(),
        unavailable: z.string().max(300).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const team = await db.getTeamByToken(input.token);
      if (!team) throw new TRPCError({ code: "NOT_FOUND" });
      const fam = await db.getFamily(input.id);
      if (!fam || fam.teamId !== team.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { token, id, ...rest } = input;
      return db.updateFamily(id, rest);
    }),

  removeFamilyByToken: publicProcedure
    .input(z.object({ token: z.string().min(1), id: z.number().int() }))
    .mutation(async ({ input }) => {
      const team = await db.getTeamByToken(input.token);
      if (!team) throw new TRPCError({ code: "NOT_FOUND" });
      const fam = await db.getFamily(input.id);
      if (!fam || fam.teamId !== team.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.deleteFamily(input.id);
      return { success: true } as const;
    }),

  /* ----- Admin: families overview ----- */
  listFamilies: adminProcedure
    .input(z.object({ teamId: z.number().int().optional() }).optional())
    .query(async ({ input }) => db.listFamilies(input?.teamId)),

  /* ----- Assignments / distribution ----- */
  // Public read: who is staffing which occasion (without contact info handled in UI).
  listAssignments: publicProcedure.query(async () => db.listAssignments()),

  // Admin: auto-distribute shifts for a season (keeps locked assignments).
  distribute: adminProcedure
    .input(z.object({ season: z.number().int() }))
    .mutation(async ({ input }) => {
      const occ = await db.listOccasions(input.season);
      if (occ.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Inga tillfällen för säsongen ännu.",
        });
      }
      const occIds = occ.map((o) => o.id);
      const fams = await db.listFamilies();
      // Clear non-locked assignments for these occasions, keep locked.
      await db.clearUnlockedAssignments(occIds);
      const remaining = (await db.listAssignments(occIds)).filter((a) => a.locked);

      const planned = distributeShifts(
        fams.map((f) => ({
          id: f.id,
          activeCount: f.activeCount,
          unavailable: parseUnavailable(f.unavailable),
        })),
        occ.map((o) => ({ id: o.id, target: o.targetCount })),
        remaining.map((a) => ({ occasionId: a.occasionId, familyId: a.familyId }))
      );

      await db.bulkInsertAssignments(
        planned.map((p) => ({
          occasionId: p.occasionId,
          familyId: p.familyId,
          locked: false,
        }))
      );
      return { added: planned.length };
    }),

  // Admin: manually add an assignment.
  addAssignment: adminProcedure
    .input(z.object({ occasionId: z.number().int(), familyId: z.number().int(), locked: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      await db.createAssignment({
        occasionId: input.occasionId,
        familyId: input.familyId,
        locked: input.locked,
      });
      return { success: true } as const;
    }),

  removeAssignment: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteAssignment(input.id);
      return { success: true } as const;
    }),

  // Admin: lock/unlock an assignment (locked are kept on re-distribution).
  setAssignmentLocked: adminProcedure
    .input(z.object({ id: z.number().int(), locked: z.boolean() }))
    .mutation(async ({ input }) => {
      await db.setAssignmentLocked(input.id, input.locked);
      return { success: true } as const;
    }),
});
