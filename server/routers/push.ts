import { z } from "zod";
import { ALL_TOPICS, decodeTopics, encodeTopics, isDutyTopic } from "@shared/push";
import * as db from "../db";
import { functionaryAreas } from "../_core/functionary";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getVapidKeys, sendTest } from "../push";

const subscriptionInput = z.object({
  endpoint: z.string().url().max(500),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export const pushRouter = router({
  // Public: the VAPID key the browser needs to subscribe.
  publicKey: publicProcedure.query(async () => ({
    publicKey: (await getVapidKeys()).publicKey,
  })),

  // Public: create/update this device's subscription and chosen topics.
  // Duty topics are only kept for logged-in functionaries.
  subscribe: publicProcedure
    .input(
      z.object({
        subscription: subscriptionInput,
        topics: z.array(z.enum(ALL_TOPICS)).max(ALL_TOPICS.length),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const areas = await functionaryAreas(ctx.user);
      const isFunctionary = areas.hockeyrink || areas.skidspar;
      const topics = input.topics.filter((t) => !isDutyTopic(t) || isFunctionary);
      await db.upsertPushSubscription({
        endpoint: input.subscription.endpoint,
        p256dh: input.subscription.keys.p256dh,
        auth: input.subscription.keys.auth,
        userId: ctx.user?.id ?? null,
        topics: encodeTopics(topics),
      });
      return { topics };
    }),

  // Public: which topics this device is subscribed to (endpoint is secret).
  mine: publicProcedure
    .input(z.object({ endpoint: z.string().max(500) }))
    .query(async ({ input }) => {
      const row = await db.getPushSubscription(input.endpoint);
      return { subscribed: Boolean(row), topics: decodeTopics(row?.topics) };
    }),

  unsubscribe: publicProcedure
    .input(z.object({ endpoint: z.string().max(500) }))
    .mutation(async ({ input }) => {
      await db.deletePushSubscription(input.endpoint);
      return { success: true } as const;
    }),

  // Inbox: the logged-in user's latest notifications (also ones not pushed).
  inbox: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.listNotifications(ctx.user.id);
    return rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      title: r.title,
      body: r.body,
      url: r.url,
      createdAt: r.createdAt,
      unread: r.readAt == null,
    }));
  }),

  // Number for the red badge on the bell (0 when logged out).
  unreadCount: publicProcedure.query(async ({ ctx }) =>
    ctx.user ? db.countUnreadNotifications(ctx.user.id) : 0
  ),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markNotificationsRead(ctx.user.id);
    return { success: true } as const;
  }),

  test: publicProcedure
    .input(z.object({ endpoint: z.string().max(500) }))
    .mutation(async ({ input }) => ({ sent: await sendTest(input.endpoint) })),
});
