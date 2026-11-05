import { z } from "zod";
import { displayName } from "@shared/user";
import * as db from "../db";
import { closeJobsForManualWork } from "../jobSync";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { assertFunctionary } from "../_core/functionary";
import { parseHelpers } from "@shared/jobs";
import { recordTrackWork } from "../work";

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
    .input(
      z.object({
        helpers: z.string().max(300).optional(),
        photoUrl: z.string().max(512).regex(/^(https?:\/\/|\/uploads\/)/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "skidspar");
      const name = displayName(ctx.user);
      const result = await recordTrackWork({
        userId: ctx.user.id,
        name,
        helpers: parseHelpers(input.helpers),
        photoUrl: input.photoUrl,
      });
      await closeJobsForManualWork("skidspar", "draget", { userId: ctx.user.id, name });
      return result;
    }),

  // Undo the latest draget marking.
  undo: protectedProcedure.mutation(async ({ ctx }) => {
    await assertFunctionary(ctx.user, "skidspar");
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
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "skidspar");
      return db.updateTrackStatus({ condition: input.condition });
    }),

  // Logged-in: set a free-text note.
  setNote: protectedProcedure
    .input(z.object({ note: z.string().max(500) }))
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "skidspar");
      return db.updateTrackStatus({ note: input.note || null });
    }),

  // Functionaries: post a new photo without marking anything.
  setPhoto: protectedProcedure
    .input(z.object({ photoUrl: z.string().max(512).regex(/^(https?:\/\/|\/uploads\/)/).nullable() }))
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "skidspar");
      const name = displayName(ctx.user);
      return db.updateTrackStatus(
        input.photoUrl
          ? { photoUrl: input.photoUrl, photoAt: new Date(), photoBy: name }
          : { photoUrl: null, photoAt: null, photoBy: null }
      );
    }),
});
