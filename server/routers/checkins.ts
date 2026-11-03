import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { isFunctionaryFor } from "../_core/functionary";
import { publicProcedure, router } from "../_core/trpc";
import { groupSize } from "@shared/push";
import { notifyTopicLater } from "../push";

const AREAS = ["hockeyrink", "skidspar"] as const;

/** Minimum group size that triggers a "gäng på väg" notification. */
const GROUP_MIN = 3;

/** How long a check-in stays visible after the arrival time. */
const STAY_MS = 3 * 3600 * 1000;

// Simple in-memory rate limit per client IP (anonymous check-ins allowed).
const recent = new Map<string, number[]>();
function rateLimit(ip: string, max = 8, windowMs = 3600 * 1000) {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Många incheckningar på kort tid – vänta en stund.",
    });
  }
  list.push(now);
  recent.set(ip, list);
}

const ownerKey = z.string().min(16).max(64);

export const checkinsRouter = router({
  // Public: active check-ins (now + later today). ownerKey is never returned;
  // pass your own keys to learn which ones you may remove.
  list: publicProcedure
    .input(z.object({ myKeys: z.array(ownerKey).max(20).optional() }).optional())
    .query(async ({ input }) => {
      const mine = new Set(input?.myKeys ?? []);
      const rows = await db.listActiveCheckins();
      return rows.map((r) => ({
        id: r.id,
        area: r.area,
        displayName: r.displayName,
        people: r.people,
        arriveAt: r.arriveAt,
        expiresAt: r.expiresAt,
        mine: mine.has(r.ownerKey),
      }));
    }),

  // Public: "Jag är här nu" / "Jag kommer kl 18".
  create: publicProcedure
    .input(
      z.object({
        area: z.enum(AREAS),
        displayName: z.string().trim().max(40).optional(),
        people: z.number().int().min(1).max(30).default(1),
        /** Epoch ms; omitted = now. Must be within the next 12 hours. */
        arriveAt: z.number().int().optional(),
        ownerKey,
      })
    )
    .mutation(async ({ ctx, input }) => {
      rateLimit(ctx.req.ip ?? "unknown");
      const now = Date.now();
      const arrive = input.arriveAt ?? now;
      if (arrive < now - 15 * 60 * 1000 || arrive > now + 12 * 3600 * 1000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Välj en tid inom de närmaste 12 timmarna.",
        });
      }
      const arriveAt = new Date(Math.max(arrive, now));
      const row = await db.createCheckin({
        area: input.area,
        displayName: input.displayName || null,
        people: input.people,
        arriveAt,
        expiresAt: new Date(arriveAt.getTime() + STAY_MS),
        ownerKey: input.ownerKey,
        userId: ctx.user?.id ?? null,
      });
      // "Ett gäng är på väg": 3+ people around the same time → notify.
      const active = (await db.listActiveCheckins()).filter((c) => c.area === input.area);
      const size = groupSize(
        active.map((c) => ({ arriveAt: new Date(c.arriveAt).getTime(), people: c.people })),
        arriveAt.getTime()
      );
      if (size >= GROUP_MIN) {
        const place = input.area === "hockeyrink" ? "rinken" : "skidspåret";
        const soon = arriveAt.getTime() - Date.now() < 10 * 60 * 1000;
        const time = arriveAt.toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Stockholm",
        });
        notifyTopicLater(
          "group",
          {
            title: input.area === "hockeyrink" ? "Ett gäng är på rinken 🏒" : "Ett gäng ska åka skidor ⛷️",
            body: soon
              ? `${size} personer på ${place} just nu – häng med!`
              : `${size} personer planerar ${place} kl ${time} – häng med!`,
            url: input.area === "hockeyrink" ? "/" : "/skidspar",
          },
          { throttleMs: 2 * 3600 * 1000, throttleKey: input.area }
        );
      }

      // Opportunistic cleanup of old rows.
      db.purgeOldCheckins().catch(() => {});
      return { id: row.id };
    }),

  // Creator (via ownerKey) or functionary/admin for the area may remove.
  remove: publicProcedure
    .input(z.object({ id: z.number().int(), ownerKeys: z.array(ownerKey).max(20).optional() }))
    .mutation(async ({ ctx, input }) => {
      const row = await db.getCheckin(input.id);
      if (!row) return { success: true } as const;
      const allowed =
        (input.ownerKeys ?? []).includes(row.ownerKey) ||
        (await isFunctionaryFor(ctx.user, row.area));
      if (!allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Du kan bara ta bort din egen incheckning." });
      }
      await db.deleteCheckin(input.id);
      return { success: true } as const;
    }),
});
