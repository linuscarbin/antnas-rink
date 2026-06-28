import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ZONES } from "@shared/rink";
import * as db from "../db";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

export const bookingsRouter = router({
  // Public: view bookings (optionally from a given time forward).
  list: publicProcedure
    .input(z.object({ fromTime: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const from = input?.fromTime ? new Date(input.fromTime) : undefined;
      return db.listBookings(from);
    }),

  // Logged-in: create a booking, with zone-aware conflict checking.
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(160),
        zone: z.enum(ZONES),
        startTime: z.number().int(),
        endTime: z.number().int(),
        note: z.string().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const start = new Date(input.startTime);
      const end = new Date(input.endTime);

      if (end <= start) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sluttiden måste vara efter starttiden.",
        });
      }

      const conflicts = await db.findConflictingBookings(
        start,
        end,
        input.zone
      );
      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Tiden krockar med en befintlig bokning för den valda zonen.",
        });
      }

      return db.createBooking({
        userId: ctx.user.id,
        bookedByName: ctx.user.name || ctx.user.email || "Okänd",
        title: input.title,
        zone: input.zone,
        startTime: start,
        endTime: end,
        note: input.note ?? null,
      });
    }),

  // Logged-in: cancel your own booking; admins can cancel any.
  cancel: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBooking(input.id);
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bokning hittades inte." });
      }
      if (booking.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Du kan bara avboka dina egna bokningar.",
        });
      }
      await db.cancelBooking(input.id);
      return { success: true } as const;
    }),

  // Admin: cancel any booking (explicit admin entry point).
  adminCancel: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.cancelBooking(input.id);
      return { success: true } as const;
    }),
});
