import { z } from "zod";
import * as db from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

export const documentsRouter = router({
  // Public: list available documents.
  list: publicProcedure.query(async () => db.listDocuments()),

  // Admin: register an uploaded document (file already uploaded via /api/upload).
  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        category: z.string().max(120).optional(),
        fileUrl: z.string().min(1).max(512),
        fileName: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ok =
        /^https?:\/\//.test(input.fileUrl) || input.fileUrl.startsWith("/uploads/");
      if (!ok) {
        throw new Error("Ogiltig fil-URL.");
      }
      await db.createDocument({
        title: input.title,
        category: input.category || null,
        fileUrl: input.fileUrl,
        fileName: input.fileName || null,
        uploadedByName: ctx.user.name || ctx.user.email || "Admin",
      });
      return { success: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true } as const;
    }),
});
