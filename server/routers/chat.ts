import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "../_core/env";
import * as db from "../db";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

/**
 * Accept only our own image URLs: the relative disk path, or an absolute URL
 * under the configured R2 public domain.
 */
function ownImageUrl(candidate: string | null | undefined): string | null {
  const r2Base = ENV.r2.publicUrl.replace(/\/+$/, "");
  const url = candidate ?? "";
  return url.startsWith("/uploads/") || (r2Base && url.startsWith(`${r2Base}/`)) ? url : null;
}

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
      const imageUrl = ownImageUrl(input.imageUrl);
      return db.createChatMessage({
        userId: ctx.user.id,
        authorName: ctx.user.name || ctx.user.email || "Okänd",
        content: text,
        imageUrl,
      });
    }),

  // Author: edit your own message (shown as "ändrad").
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        content: z.string().max(1000),
        imageUrl: z.string().max(512).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const msg = await db.getChatMessage(input.id);
      if (!msg || msg.deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Inlägget finns inte." });
      if (msg.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Du kan bara ändra dina egna inlägg." });
      }
      const text = input.content.trim();
      const imageUrl = ownImageUrl(input.imageUrl);
      if (!text && !imageUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Skriv något eller bifoga en bild." });
      }
      await db.updateChatMessage(msg.id, text, imageUrl);
      return { success: true } as const;
    }),

  // Author or admin: remove a message.
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const msg = await db.getChatMessage(input.id);
      if (!msg) return { success: true } as const;
      if (msg.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Du kan bara ta bort dina egna inlägg." });
      }
      await db.softDeleteChatMessage(input.id);
      return { success: true } as const;
    }),
});
