import { z } from "zod";
import * as db from "../db";
import { functionaryAreas } from "../_core/functionary";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const guideInput = z.object({
  title: z.string().trim().min(1).max(160),
  area: z.enum(["publik", "alla", "hockeyrink", "skidspar"]),
  body: z.string().max(20000),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export const guidesRouter = router({
  // Everyone: public info pages (rules, how to plow yourself, where snow goes).
  publicList: publicProcedure.query(async () => {
    const rows = await db.listGuides();
    return rows.filter((g) => g.area === "publik");
  }),

  // Functionaries: guides for the areas they are on duty for (+ "alla").
  // Others get an empty list — guides may contain codes and phone numbers.
  list: protectedProcedure.query(async ({ ctx }) => {
    const areas = await functionaryAreas(ctx.user);
    if (!areas.hockeyrink && !areas.skidspar) return [];
    const rows = await db.listGuides();
    return rows.filter(
      (g) => g.area === "alla" || (g.area !== "publik" && areas[g.area])
    );
  }),

  // Admin: all guides for editing.
  adminList: adminProcedure.query(() => db.listGuides()),

  create: adminProcedure.input(guideInput).mutation(async ({ ctx, input }) => {
    const id = await db.createGuide({
      ...input,
      updatedByName: ctx.user.name || ctx.user.email,
    });
    return { id };
  }),

  update: adminProcedure
    .input(guideInput.extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateGuide(id, {
        ...data,
        updatedByName: ctx.user.name || ctx.user.email,
      });
      return { success: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteGuide(input.id);
      return { success: true } as const;
    }),
});
