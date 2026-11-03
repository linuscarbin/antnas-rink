import { z } from "zod";
import { ALL_TOPICS, decodeTopics, encodeTopics, isDutyTopic } from "@shared/push";
import * as db from "../db";
import { functionaryAreas } from "../_core/functionary";
import { publicProcedure, router } from "../_core/trpc";
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

  test: publicProcedure
    .input(z.object({ endpoint: z.string().max(500) }))
    .mutation(async ({ input }) => ({ sent: await sendTest(input.endpoint) })),
});
