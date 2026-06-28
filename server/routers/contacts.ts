import { z } from "zod";
import * as db from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

export const contactsRouter = router({
  list: publicProcedure.query(async () => {
    return db.listContacts();
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        role: z.string().min(1).max(120),
        phone: z.string().max(40).optional().nullable(),
        email: z.string().max(320).optional().nullable(),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ input }) => {
      return db.createContact(input);
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(120).optional(),
        role: z.string().min(1).max(120).optional(),
        phone: z.string().max(40).optional().nullable(),
        email: z.string().max(320).optional().nullable(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateContact(id, data);
      return { success: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteContact(input.id);
      return { success: true } as const;
    }),
});
