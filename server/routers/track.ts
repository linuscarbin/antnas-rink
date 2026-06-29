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

export const trackRouter = router({
  // Public: read current ski-track status.
  get: publicProcedure.query(async () => {
    return db.getTrackStatus();
  }),

  // Logged-in: mark the track as groomed (draget) now.
  markDraget: protectedProcedure
    .input(z.object({ done: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const name = ctx.user.name || ctx.user.email || "Okänd";
      return db.updateTrackStatus({
        dragetAt: input.done ? new Date() : null,
        dragetBy: input.done ? name : null,
      });
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
