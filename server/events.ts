import type { Request } from "express";
import { formatJobWindow } from "@shared/jobs";
import * as db from "./db";
import { emailLayout, esc, sendEmail } from "./email";
import { baseUrl } from "./accounts";
import { ENV } from "./_core/env";
import { isQuietTime } from "@shared/push";
import { notifyUsers } from "./push";

type Ev = NonNullable<Awaited<ReturnType<typeof db.getEvent>>>;

export const AREA_TEXT: Record<Ev["area"], string> = {
  hockeyrink: "rinken",
  skidspar: "skidspåret",
  alla: "rinken och spåret",
};

/** Who an event is for: everyone with an account, or the area's functionaries. */
export async function audienceUserIds(ev: Pick<Ev, "audience" | "area">): Promise<number[]> {
  if (ev.audience === "all") return (await db.listUsers()).map((u) => u.id);
  const areas = ev.area === "alla" ? (["hockeyrink", "skidspar"] as const) : ([ev.area] as const);
  const ids = new Set<number>();
  for (const a of areas) (await db.listFunctionaryUserIds(a)).forEach((id) => ids.add(id));
  return Array.from(ids);
}

export const eventWhen = (ev: Pick<Ev, "startsAt" | "endsAt">) =>
  formatJobWindow(new Date(ev.startsAt), new Date(ev.endsAt));

const siteUrl = (req?: Request) =>
  req ? baseUrl(req) : (ENV.publicBaseUrl || "").replace(/\/+$/, "");

/** E-mails the call-out to everyone in the audience who has an e-mail address. */
export async function emailCallout(ev: Ev, req?: Request) {
  const ids = new Set(await audienceUserIds(ev));
  const recipients = (await db.listUsers())
    .filter((u) => ids.has(u.id) && u.email && u.id !== ev.createdByUserId)
    .map((u) => u.email!) ;
  if (!recipients.length) return 0;
  const link = `${siteUrl(req)}/arbetsdagar`;
  const html = emailLayout(
    esc(ev.title),
    `<p><strong>${esc(eventWhen(ev))}</strong>${ev.location ? ` · ${esc(ev.location)}` : ""}</p>
     ${ev.description ? `<p style="white-space:pre-line">${esc(ev.description)}</p>` : ""}
     <p>${esc(ev.createdByName)} kallar till ${esc(AREA_TEXT[ev.area])}. Kan du komma?</p>
     <p><a href="${esc(link)}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:700">Svara i appen</a></p>`
  );
  // One e-mail per person so addresses aren't shared with everyone.
  let sent = 0;
  for (const to of recipients) {
    const r = await sendEmail({ to, subject: `${ev.title} – ${eventWhen(ev)}`, html });
    if (r.sent) sent++;
  }
  return sent;
}

/** Sends the push call-out unless it's quiet hours (then the scheduler retries). */
export async function announceIfPossible(ev: Ev) {
  if (ev.announced || isQuietTime(new Date())) return false;
  const ids = (await audienceUserIds(ev)).filter((id) => id !== ev.createdByUserId);
  await notifyUsers(ids, {
    title: `📣 ${ev.title}`,
    body: `${eventWhen(ev)}${ev.location ? ` · ${ev.location}` : ""} – kan du komma? Svara i appen.`,
    url: "/arbetsdagar",
    tag: `event-${ev.id}`,
  });
  await db.updateEvent(ev.id, { announced: true });
  return true;
}

/** Push to everyone who answered yes/maybe (reminder, change, cancellation). */
export async function notifyResponders(
  ev: Ev,
  msg: { title: string; body: string },
  exceptUserId?: number
) {
  const ids = (await db.listEventResponses(ev.id))
    .filter((r) => r.answer !== "no" && r.userId !== exceptUserId)
    .map((r) => r.userId);
  if (ids.length) await notifyUsers(ids, { ...msg, url: "/arbetsdagar", tag: `event-${ev.id}` });
}

/**
 * Scheduler job (every 10 min): send call-outs that waited for quiet hours to
 * end, and remind those coming ~3 hours before start.
 */
export async function runEventJobs() {
  let announced = 0;
  for (const ev of await db.eventsNeedingAnnouncement()) {
    if (await announceIfPossible(ev)) announced++;
  }
  let reminded = 0;
  if (!isQuietTime(new Date())) {
    for (const ev of await db.eventsNeedingReminder(3 * 3600 * 1000)) {
      await notifyResponders(ev, {
        title: `Snart: ${ev.title}`,
        body: `${eventWhen(ev)}${ev.location ? ` · ${ev.location}` : ""}. Välkommen!`,
      });
      await db.updateEvent(ev.id, { reminderSent: true });
      reminded++;
    }
  }
  return { announced, reminded };
}
