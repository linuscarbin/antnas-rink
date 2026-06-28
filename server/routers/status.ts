import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const statusRouter = router({
  // Public: anyone can read the current rink status.
  get: publicProcedure.query(async () => {
    return db.getRinkStatus();
  }),

  // Logged-in users can mark plogad / spolad (sets timestamp + their name).
  markPlogad: protectedProcedure
    .input(z.object({ done: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const name = ctx.user.name || ctx.user.email || "Okänd";
      return db.updateRinkStatus({
        plogadAt: input.done ? new Date() : null,
        plogadBy: input.done ? name : null,
      });
    }),

  markSpolad: protectedProcedure
    .input(z.object({ done: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const name = ctx.user.name || ctx.user.email || "Okänd";
      return db.updateRinkStatus({
        spoladAt: input.done ? new Date() : null,
        spoladBy: input.done ? name : null,
      });
    }),

  setNote: protectedProcedure
    .input(z.object({ note: z.string().max(500) }))
    .mutation(async ({ input }) => {
      return db.updateRinkStatus({ note: input.note || null });
    }),
});
