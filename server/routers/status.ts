import { z } from "zod";
import { displayName } from "@shared/user";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { assertFunctionary } from "../_core/functionary";
import { parseHelpers } from "@shared/jobs";
import { recordRinkWork } from "../work";

/** Returns Date of the start of the current winter season (Jul 1 -> Jun 30). */
function seasonStart(now = new Date()): Date {
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(Date.UTC(year, 6, 1));
}

export const statusRouter = router({
  get: publicProcedure.query(async () => {
    return db.getRinkStatus();
  }),

  markPlogad: protectedProcedure
    .input(
      z.object({
        helpers: z.string().max(300).optional(),
        photoUrl: z.string().max(512).regex(/^(https?:\/\/|\/uploads\/)/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "hockeyrink");
      return recordRinkWork("plogad", {
        userId: ctx.user.id,
        name: displayName(ctx.user),
        helpers: parseHelpers(input.helpers),
        photoUrl: input.photoUrl,
      });
    }),

  markSpolad: protectedProcedure
    .input(
      z.object({
        helpers: z.string().max(300).optional(),
        photoUrl: z.string().max(512).regex(/^(https?:\/\/|\/uploads\/)/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "hockeyrink");
      return recordRinkWork("spolad", {
        userId: ctx.user.id,
        name: displayName(ctx.user),
        helpers: parseHelpers(input.helpers),
        photoUrl: input.photoUrl,
      });
    }),

  // Undo the latest plogad/spolad marking (clears timestamp + removes effort).
  undo: protectedProcedure
    .input(z.object({ kind: z.enum(["plogad", "spolad"]) }))
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "hockeyrink");
      await db.removeLatestEffort(input.kind);
      if (input.kind === "plogad") {
        return db.updateRinkStatus({ plogadAt: null, plogadBy: null });
      }
      return db.updateRinkStatus({ spoladAt: null, spoladBy: null });
    }),

  setNote: protectedProcedure
    .input(z.object({ note: z.string().max(500) }))
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "hockeyrink");
      return db.updateRinkStatus({ note: input.note || null });
    }),

  // Public: contribution leaderboard for the rink (plogad + spolad).
  leaderboard: publicProcedure
    .input(z.object({ allTime: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const since = input?.allTime ? undefined : seasonStart();
      return db.getEffortLeaderboard(["plogad", "spolad"], since);
    }),

  // Functionaries: post a new photo without marking anything.
  setPhoto: protectedProcedure
    .input(z.object({ photoUrl: z.string().max(512).regex(/^(https?:\/\/|\/uploads\/)/).nullable() }))
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "hockeyrink");
      const name = displayName(ctx.user);
      return db.updateRinkStatus(
        input.photoUrl
          ? { photoUrl: input.photoUrl, photoAt: new Date(), photoBy: name }
          : { photoUrl: null, photoAt: null, photoBy: null }
      );
    }),
});
