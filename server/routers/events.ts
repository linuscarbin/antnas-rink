import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { displayName } from "@shared/user";
import * as db from "../db";
import {
  announceIfPossible,
  audienceUserIds,
  emailCallout,
  eventWhen,
  notifyResponders,
} from "../events";
import { functionaryAreas } from "../_core/functionary";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const HOUR = 3600 * 1000;

const eventInput = z.object({
  title: z.string().trim().min(1).max(160),
  area: z.enum(["hockeyrink", "skidspar", "alla"]),
  startsAt: z.number().int(),
  endsAt: z.number().int(),
  location: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  audience: z.enum(["all", "functionaries"]),
});

function validateTimes(startsAt: number, endsAt: number) {
  if (endsAt <= startsAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Sluttiden måste vara efter starttiden." });
  }
  if (endsAt - startsAt > 16 * HOUR) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "En arbetsdag kan vara max 16 timmar." });
  }
  if (endsAt < Date.now() || startsAt > Date.now() + 365 * 24 * HOUR) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Välj en tid framåt (inom ett år)." });
  }
}

type Viewer = { id: number; role: "user" | "admin" } | null | undefined;

/** Admins and functionaries can call people together. */
async function assertCanCreate(user: Viewer) {
  if (user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Bara admin kan kalla till arbetsdag." });
  }
}

async function assertCanManage(user: NonNullable<Viewer>, ev: { createdByUserId: number }) {
  if (user.role !== "admin" && ev.createdByUserId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Bara den som skapade kallelsen kan ändra den." });
  }
}

export const eventsRouter = router({
  // Public: upcoming work days. Functionary-only events and who's coming are
  // only shown to those it concerns / logged-in users.
  list: publicProcedure.query(async ({ ctx }) => {
    const areas = await functionaryAreas(ctx.user);
    const isFunctionary = areas.hockeyrink || areas.skidspar;
    const rows = await db.listUpcomingEvents();
    return rows
      .filter((e) => e.audience === "all" || isFunctionary)
      .map((e) => ({
        id: e.id,
        title: e.title,
        area: e.area,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        location: e.location,
        description: e.description,
        audience: e.audience,
        createdByName: e.createdByName,
        canManage: !!ctx.user && (ctx.user.role === "admin" || e.createdByUserId === ctx.user.id),
        myAnswer: ctx.user ? e.responses.find((r) => r.userId === ctx.user!.id)?.answer ?? null : null,
        myComment: ctx.user ? e.responses.find((r) => r.userId === ctx.user!.id)?.comment ?? null : null,
        counts: {
          yes: e.responses.filter((r) => r.answer === "yes").length,
          maybe: e.responses.filter((r) => r.answer === "maybe").length,
          no: e.responses.filter((r) => r.answer === "no").length,
        },
        // Names and comments only for logged-in users.
        responses: ctx.user
          ? e.responses.map((r) => ({ name: r.name, answer: r.answer, comment: r.comment }))
          : [],
      }));
  }),

  create: protectedProcedure.input(eventInput).mutation(async ({ ctx, input }) => {
    await assertCanCreate(ctx.user);
    validateTimes(input.startsAt, input.endsAt);
    const id = await db.createEvent({
      title: input.title,
      area: input.area,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      location: input.location || null,
      description: input.description || null,
      audience: input.audience,
      createdByUserId: ctx.user.id,
      createdByName: displayName(ctx.user),
    });
    // The organizer is coming, of course.
    await db.setEventResponse(id, ctx.user.id, displayName(ctx.user), "yes", null);
    const ev = (await db.getEvent(id))!;
    const [pushed, mailed] = await Promise.all([
      announceIfPossible(ev).catch(() => false),
      emailCallout(ev, ctx.req).catch((e) => {
        console.warn("[Events] mail failed:", e);
        return 0;
      }),
    ]);
    const reach = (await audienceUserIds(ev)).length;
    return { id, reach, pushedNow: pushed, mailed };
  }),

  update: protectedProcedure
    .input(eventInput.extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const ev = await db.getEvent(input.id);
      if (!ev || ev.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "Kallelsen finns inte." });
      await assertCanManage(ctx.user, ev);
      validateTimes(input.startsAt, input.endsAt);
      const timeChanged =
        new Date(ev.startsAt).getTime() !== input.startsAt || new Date(ev.endsAt).getTime() !== input.endsAt;
      await db.updateEvent(ev.id, {
        title: input.title,
        area: input.area,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        location: input.location || null,
        description: input.description || null,
        audience: input.audience,
        ...(timeChanged ? { reminderSent: false } : {}),
      });
      if (timeChanged) {
        const fresh = (await db.getEvent(ev.id))!;
        await notifyResponders(
          fresh,
          { title: `Ändrad tid: ${fresh.title}`, body: `Nu ${eventWhen(fresh)}.` },
          ctx.user.id
        );
      }
      return { success: true } as const;
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const ev = await db.getEvent(input.id);
      if (!ev || ev.status !== "active") return { success: true } as const;
      await assertCanManage(ctx.user, ev);
      await db.updateEvent(ev.id, { status: "cancelled" });
      await notifyResponders(ev, { title: `Inställt: ${ev.title}`, body: `${eventWhen(ev)} blir inte av.` }, ctx.user.id);
      return { success: true } as const;
    }),

  // Anyone the event is for: Kommer / Kanske / Kan inte (+ comment).
  respond: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        answer: z.enum(["yes", "maybe", "no"]).nullable(),
        comment: z.string().trim().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ev = await db.getEvent(input.id);
      if (!ev || ev.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "Kallelsen finns inte längre." });
      if (ev.audience === "functionaries") {
        const areas = await functionaryAreas(ctx.user);
        if (!areas.hockeyrink && !areas.skidspar) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Den här kallelsen gäller jourhavare." });
        }
      }
      await db.setEventResponse(ev.id, ctx.user.id, displayName(ctx.user), input.answer, input.comment || null);
      return { success: true } as const;
    }),
});
