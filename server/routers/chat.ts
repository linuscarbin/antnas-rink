import { TRPCError } from "@trpc/server";
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

  // Logged-in: post a message, optionally with an uploaded image URL.
  post: protectedProcedure
    .input(
      z.object({
        content: z.string().max(1000),
        imageUrl: z.string().max(512).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const text = input.content.trim();
      if (!text && !input.imageUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Skriv något eller bifoga en bild.",
        });
      }
      // Only allow our own uploads path.
      const imageUrl =
        input.imageUrl && input.imageUrl.startsWith("/uploads/")
          ? input.imageUrl
          : null;
      return db.createChatMessage({
        userId: ctx.user.id,
        authorName: ctx.user.name || ctx.user.email || "Okänd",
        content: text,
        imageUrl,
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
