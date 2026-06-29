import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

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
    .input(z.object({ helpers: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const name = ctx.user.name || ctx.user.email || "Okänd";
      await db.logEffort({
        kind: "plogad",
        userId: ctx.user.id,
        byName: name,
        helpers: input.helpers?.trim() || null,
      });
      return db.updateRinkStatus({ plogadAt: new Date(), plogadBy: name });
    }),

  markSpolad: protectedProcedure
    .input(z.object({ helpers: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const name = ctx.user.name || ctx.user.email || "Okänd";
      await db.logEffort({
        kind: "spolad",
        userId: ctx.user.id,
        byName: name,
        helpers: input.helpers?.trim() || null,
      });
      return db.updateRinkStatus({ spoladAt: new Date(), spoladBy: name });
    }),

  // Undo the latest plogad/spolad marking (clears timestamp + removes effort).
  undo: protectedProcedure
    .input(z.object({ kind: z.enum(["plogad", "spolad"]) }))
    .mutation(async ({ input }) => {
      await db.removeLatestEffort(input.kind);
      if (input.kind === "plogad") {
        return db.updateRinkStatus({ plogadAt: null, plogadBy: null });
      }
      return db.updateRinkStatus({ spoladAt: null, spoladBy: null });
    }),

  setNote: protectedProcedure
    .input(z.object({ note: z.string().max(500) }))
    .mutation(async ({ input }) => {
      return db.updateRinkStatus({ note: input.note || null });
    }),

  // Public: contribution leaderboard for the rink (plogad + spolad).
  leaderboard: publicProcedure
    .input(z.object({ allTime: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      const since = input?.allTime ? undefined : seasonStart();
      return db.getEffortLeaderboard(["plogad", "spolad"], since);
    }),
});
