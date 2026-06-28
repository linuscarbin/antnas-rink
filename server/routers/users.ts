import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

export const usersRouter = router({
  // Logged-in: update your own profile (name + phone for duty contact).
  updateMe: protectedProcedure
    .input(
      z.object({
        name: z.string().max(120).optional(),
        phone: z.string().max(40).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      return db.getUserById(ctx.user.id);
    }),

  // Public: lightweight list of members for duty assignment dropdowns.
  // Returns only id + name (no contact details) and requires login.
  listForAssignment: protectedProcedure.query(async () => {
    const users = await db.listUsers();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
    }));
  }),

  // Admin: full user list.
  list: adminProcedure.query(async () => {
    return db.listUsers();
  }),

  // Admin: change a user's role. Protects the project owner from demotion.
  setRole: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const target = await db.getUserById(input.id);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Användare hittades inte." });
      }
      if (target.id === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Du kan inte ta bort din egen adminbehörighet.",
        });
      }
      await db.setUserRole(input.id, input.role);
      return { success: true } as const;
    }),
});
