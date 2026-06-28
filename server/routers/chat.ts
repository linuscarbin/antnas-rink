import { z } from "zod";
import * as db from "../db";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

export const chatRouter = router({
  // Public: read messages. `afterId` enables incremental polling for realtime feel.
  list: publicProcedure
    .input(z.object({ afterId: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      return db.listChatMessages(input?.afterId);
    }),

  // Logged-in: post a message.
  post: protectedProcedure
    .input(z.object({ content: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      return db.createChatMessage({
        userId: ctx.user.id,
        authorName: ctx.user.name || ctx.user.email || "Okänd",
        content: input.content,
      });
    }),

  // Admin: soft-delete (moderate) a message.
  remove: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.softDeleteChatMessage(input.id);
      return { success: true } as const;
    }),
});
