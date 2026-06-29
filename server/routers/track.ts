import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const CONDITIONS = [
  "Mycket bra",
  "Bra",
  "Hyfsat",
  "Dåligt",
  "Ej åkbart",
] as const;

/** Start of the current winter season (Jul 1 -> Jun 30). */
function seasonStart(now = new Date()): Date {
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(Date.UTC(year, 6, 1));
}

export const trackRouter = router({
  // Public: read current ski-track status.
  get: publicProcedure.query(async () => {
    return db.getTrackStatus();
  }),

  // Logged-in: mark the track as groomed (draget) now.
  markDraget: protectedProcedure
    .input(z.object({ helpers: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const name = ctx.user.name || ctx.user.email || "Okänd";
      await db.logEffort({
        kind: "draget",
        userId: ctx.user.id,
        byName: name,
        helpers: input.helpers?.trim() || null,
      });
      return db.updateTrackStatus({ dragetAt: new Date(), dragetBy: name });
    }),

  // Undo the latest draget marking.
  undo: protectedProcedure.mutation(async () => {
    await db.removeLatestEffort("draget");
    return db.updateTrackStatus({ dragetAt: null, dragetBy: null });
  }),

  // Public: contribution leaderboard for the ski track (draget).
  leaderboard: publicProcedure
    .input(z.object({ allTime: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const since = input?.allTime ? undefined : seasonStart();
      return db.getEffortLeaderboard(["draget"], since);
    }),

  // Logged-in: set the track condition.
  setCondition: protectedProcedure
    .input(z.object({ condition: z.enum(CONDITIONS) }))
    .mutation(async ({ input }) => {
      return db.updateTrackStatus({ condition: input.condition });
    }),

  // Logged-in: set a free-text note.
  setNote: protectedProcedure
    .input(z.object({ note: z.string().max(500) }))
    .mutation(async ({ input }) => {
      return db.updateTrackStatus({ note: input.note || null });
    }),
});
