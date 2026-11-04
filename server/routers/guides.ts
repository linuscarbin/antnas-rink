import { TRPCError } from "@trpc/server";
import { displayName } from "@shared/user";
import { z } from "zod";
import * as db from "../db";
import { functionaryAreas } from "../_core/functionary";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

type GuideArea = "publik" | "alla" | "hockeyrink" | "skidspar";

const guideInput = z.object({
  title: z.string().trim().min(1).max(160),
  area: z.enum(["publik", "alla", "hockeyrink", "skidspar"]),
  body: z.string().max(20000),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

type Viewer = { id: number; role: "user" | "admin" };

/**
 * Who may write a guide with a given visibility: admins anything; functionaries
 * public tips, "alla jourhavare" and the areas they are on duty for.
 */
async function assertCanWrite(user: Viewer, area: GuideArea) {
  if (user.role === "admin") return;
  const areas = await functionaryAreas(user);
  const isFunctionary = areas.hockeyrink || areas.skidspar;
  const ok =
    isFunctionary &&
    (area === "publik" || area === "alla" || areas[area as "hockeyrink" | "skidspar"]);
  if (!ok) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Bara jourhavare och admin kan skriva guider.",
    });
  }
}

/** Admins edit everything; others only guides they wrote. */
async function assertCanEdit(user: Viewer, id: number) {
  const guide = await db.getGuide(id);
  if (!guide) throw new TRPCError({ code: "NOT_FOUND", message: "Guiden finns inte." });
  if (user.role !== "admin" && guide.createdByUserId !== user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Du kan bara ändra guider du själv har skrivit.",
    });
  }
  return guide;
}

export const guidesRouter = router({
  // Everyone: public info pages (rules, how to plow yourself, where snow goes).
  publicList: publicProcedure.query(async () => {
    const rows = await db.listGuides();
    return rows.filter((g) => g.area === "publik");
  }),

  // Functionaries: guides for their areas + "alla" + public tips, with
  // `canEdit`. Others get an empty list — guides may contain codes and phones.
  list: protectedProcedure.query(async ({ ctx }) => {
    const areas = await functionaryAreas(ctx.user);
    if (!areas.hockeyrink && !areas.skidspar) return [];
    const isAdmin = ctx.user.role === "admin";
    const rows = await db.listGuides();
    return rows
      .filter((g) => g.area === "alla" || g.area === "publik" || areas[g.area])
      .map((g) => ({ ...g, canEdit: isAdmin || g.createdByUserId === ctx.user.id }));
  }),

  // Admin: all guides for editing.
  adminList: adminProcedure.query(() => db.listGuides()),

  create: protectedProcedure.input(guideInput).mutation(async ({ ctx, input }) => {
    await assertCanWrite(ctx.user, input.area);
    const id = await db.createGuide({
      ...input,
      createdByUserId: ctx.user.id,
      updatedByName: displayName(ctx.user),
    });
    return { id };
  }),

  update: protectedProcedure
    .input(guideInput.extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEdit(ctx.user, input.id);
      await assertCanWrite(ctx.user, input.area);
      const { id, ...data } = input;
      await db.updateGuide(id, {
        ...data,
        updatedByName: displayName(ctx.user),
      });
      return { success: true } as const;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEdit(ctx.user, input.id);
      await db.deleteGuide(input.id);
      return { success: true } as const;
    }),
});
