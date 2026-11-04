import webpush from "web-push";
import { isQuietTime, type PushTopic } from "@shared/push";
import * as db from "./db";
import { ENV } from "./_core/env";

const VAPID_SETTING = "vapid_keys";

let vapid: { publicKey: string; privateKey: string } | null = null;

/**
 * VAPID keys identify this server to the browsers' push services.
 * Taken from env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) if set, otherwise
 * generated once and stored in the database so they survive redeploys.
 */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (vapid) return vapid;
  if (ENV.vapid.publicKey && ENV.vapid.privateKey) {
    vapid = { publicKey: ENV.vapid.publicKey, privateKey: ENV.vapid.privateKey };
  } else {
    const row = await db.getSetting(VAPID_SETTING);
    if (row?.settingValue) {
      vapid = JSON.parse(row.settingValue);
    } else {
      vapid = webpush.generateVAPIDKeys();
      await db.setSetting(VAPID_SETTING, JSON.stringify(vapid));
      console.log("[Push] Generated and stored new VAPID keys.");
    }
  }
  webpush.setVapidDetails(vapidSubject(), vapid!.publicKey, vapid!.privateKey);
  return vapid!;
}

function vapidSubject(): string {
  if (ENV.vapid.subject) return ENV.vapid.subject;
  if (/^https:\/\//.test(ENV.publicBaseUrl)) return ENV.publicBaseUrl;
  const email = ENV.mailFrom.match(/[^<\s]+@[^>\s]+/)?.[0];
  return email ? `mailto:${email}` : "mailto:noreply@antnas.se";
}

export type PushMessage = {
  title: string;
  body: string;
  /** Page to open when the notification is tapped. */
  url?: string;
  /** Same tag replaces an older notification on the device. */
  tag?: string;
};

/** Sends one message to one subscription. Removes dead subscriptions. */
async function sendTo(
  sub: { endpoint: string; p256dh: string; auth: string },
  msg: PushMessage
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(msg),
      { TTL: 6 * 3600, urgency: "normal" }
    );
    return true;
  } catch (err: any) {
    const status = err?.statusCode;
    if (status === 404 || status === 410) {
      await db.deletePushSubscription(sub.endpoint).catch(() => {});
    } else {
      console.warn("[Push] send failed:", status ?? err?.message ?? err);
    }
    return false;
  }
}

/**
 * Notifies everyone subscribed to a topic.
 * - Skips during quiet hours (22–07 Swedish time) unless `ignoreQuiet`.
 * - `throttleMs`: at most one notification per topic (+ throttleKey) within
 *   that window, so e.g. several "spolad" markings don't spam people.
 */
export async function notifyTopic(
  topic: PushTopic,
  msg: PushMessage,
  opts: {
    userIds?: number[];
    throttleMs?: number;
    throttleKey?: string;
    ignoreQuiet?: boolean;
    now?: Date;
  } = {}
): Promise<{ sent: number; skipped?: "quiet" | "throttled" }> {
  const now = opts.now ?? new Date();
  if (!opts.ignoreQuiet && isQuietTime(now)) return { sent: 0, skipped: "quiet" };

  if (opts.throttleMs) {
    const key = `push_last_${topic}${opts.throttleKey ? `_${opts.throttleKey}` : ""}`;
    const last = Number((await db.getSetting(key))?.settingValue ?? 0);
    if (last && now.getTime() - last < opts.throttleMs) {
      return { sent: 0, skipped: "throttled" };
    }
    await db.setSetting(key, String(now.getTime()));
  }

  await getVapidKeys();
  const subs = await db.listPushSubscriptions(topic, opts.userIds);
  const results = await Promise.all(subs.map((s) => sendTo(s, { tag: topic, ...msg })));
  const sent = results.filter(Boolean).length;
  if (subs.length) console.log(`[Push] ${topic}: sent ${sent}/${subs.length}`);
  return { sent };
}

/** Fire-and-forget wrapper for use inside request handlers. */
export function notifyTopicLater(...args: Parameters<typeof notifyTopic>): void {
  notifyTopic(...args).catch((e) => console.warn("[Push] notify failed:", e));
}

/** Sends a test notification to a single subscription. */
export async function sendTest(endpoint: string): Promise<boolean> {
  await getVapidKeys();
  const sub = await db.getPushSubscription(endpoint);
  if (!sub) return false;
  return sendTo(sub, {
    title: "Notiser är på ✅",
    body: "Så här ser det ut när rinken är nyspolad eller ett gäng är på väg.",
    url: "/",
    tag: "test",
  });
}

/** "Förhinder": tell admins + the area's other functionaries a stand-in is needed. */
export function notifyConflict(area: "hockeyrink" | "skidspar", body: string): void {
  (async () => {
    const userIds = await db.listFunctionaryUserIds(area);
    await notifyTopic(
      "duty_conflict",
      { title: "Förhinder i jouren ⚠️", body, url: area === "hockeyrink" ? "/schema" : "/skidspar" },
      { userIds }
    );
  })().catch((e) => console.warn("[Push] conflict notify failed:", e));
}

/**
 * Direct notification to specific people (e.g. a work-day call-out),
 * regardless of which topics they picked. Quiet hours still apply unless
 * `ignoreQuiet`.
 */
export async function notifyUsers(
  userIds: number[],
  msg: PushMessage,
  opts: { ignoreQuiet?: boolean; now?: Date } = {}
): Promise<{ sent: number; skipped?: "quiet" }> {
  if (!opts.ignoreQuiet && isQuietTime(opts.now ?? new Date())) return { sent: 0, skipped: "quiet" };
  await getVapidKeys();
  const subs = await db.listPushSubscriptionsForUsers(Array.from(new Set(userIds)));
  const results = await Promise.all(subs.map((s) => sendTo(s, msg)));
  const sent = results.filter(Boolean).length;
  if (subs.length) console.log(`[Push] direct: sent ${sent}/${subs.length}`);
  return { sent };
}
