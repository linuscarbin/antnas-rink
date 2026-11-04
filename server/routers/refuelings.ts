import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";
import { assertFunctionary } from "../_core/functionary";

const AREAS = ["hockeyrink", "skidspar"] as const;

function seasonStart(now = new Date()): Date {
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(Date.UTC(year, 6, 1));
}

export const refuelingsRouter = router({
  // Functionaries (on duty for the area) + admin: list refuelings for an area (auditable record).
  list: protectedProcedure
    .input(z.object({ area: z.enum(AREAS) }))
    .query(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, input.area);
      return db.listRefuelings(input.area);
    }),

  // Functionaries + admin: summary totals for an area (season or all time).
  summary: protectedProcedure
    .input(
      z.object({
        area: z.enum(AREAS),
        allTime: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, input.area);
      const rows = await db.listRefuelings(input.area);
      const since = input.allTime ? null : seasonStart();
      const filtered = since
        ? rows.filter((r) => new Date(r.purchasedAt) >= since)
        : rows;
      let totalOre = 0;
      let toReimburseOre = 0;
      for (const r of filtered) {
        totalOre += r.amountOre;
        if (r.paymentMethod === "egen" && !r.reimbursed) {
          toReimburseOre += r.amountOre;
        }
      }
      return {
        count: filtered.length,
        totalSek: totalOre / 100,
        toReimburseSek: toReimburseOre / 100,
      };
    }),

  // Logged-in: register a refueling (the user becomes responsible/ansvarig).
  create: protectedProcedure
    .input(
      z.object({
        area: z.enum(AREAS),
        amountSek: z.number().min(0).max(100000),
        litres: z.number().min(0).max(10000).optional(),
        paymentMethod: z.enum(["tankkort_abk", "egen"]),
        note: z.string().max(500).optional(),
        receiptUrl: z.string().max(512).optional(),
        purchasedAt: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, input.area);
      const receiptUrl =
        input.receiptUrl && /^https?:\/\/|^\/uploads\//.test(input.receiptUrl)
          ? input.receiptUrl
          : null;
      return db.createRefueling({
        area: input.area,
        userId: ctx.user.id,
        responsibleName: ctx.user.name || ctx.user.email || "Okänd",
        amountOre: Math.round(input.amountSek * 100),
        litresCenti:
          input.litres != null ? Math.round(input.litres * 100) : null,
        paymentMethod: input.paymentMethod,
        note: input.note?.trim() || null,
        receiptUrl,
        purchasedAt: input.purchasedAt
          ? new Date(input.purchasedAt)
          : new Date(),
      });
    }),

  // Admin: mark an own-pay refueling as reimbursed (or undo).
  setReimbursed: adminProcedure
    .input(z.object({ id: z.number().int(), reimbursed: z.boolean() }))
    .mutation(async ({ input }) => {
      return db.setRefuelingReimbursed(input.id, input.reimbursed);
    }),

  // Owner or admin: delete a refueling.
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const row = await db.getRefueling(input.id);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (row.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Endast den som registrerat eller admin kan ta bort.",
        });
      }
      if (row.reimbursed && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Redan återbetald – be en admin om du behöver ändra.",
        });
      }
      await db.deleteRefueling(input.id);
      return { success: true } as const;
    }),

  // Owner (or admin): fix a mistake. Locked for non-admins once reimbursed.
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        amountSek: z.number().min(0).max(1000000),
        litres: z.number().min(0).max(10000).optional().nullable(),
        paymentMethod: z.enum(["tankkort_abk", "egen"]),
        note: z.string().max(500).optional().nullable(),
        receiptUrl: z.string().max(512).optional().nullable(),
        purchasedAt: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = await db.getRefueling(input.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const isAdmin = ctx.user.role === "admin";
      if (row.userId !== ctx.user.id && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Du kan bara ändra tankningen du själv har registrerat.",
        });
      }
      if (row.reimbursed && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Redan återbetald – be en admin om du behöver ändra.",
        });
      }
      const receiptUrl =
        input.receiptUrl && /^https?:\/\/|^\/uploads\//.test(input.receiptUrl)
          ? input.receiptUrl
          : null;
      return db.updateRefueling(row.id, {
        amountOre: Math.round(input.amountSek * 100),
        litresCenti: input.litres != null ? Math.round(input.litres * 100) : null,
        paymentMethod: input.paymentMethod,
        // Switching to the club card means nothing to reimburse.
        ...(input.paymentMethod === "tankkort_abk" ? { reimbursed: false } : {}),
        note: input.note?.trim() || null,
        receiptUrl,
        ...(input.purchasedAt ? { purchasedAt: new Date(input.purchasedAt) } : {}),
      });
    }),
});
