import * as db from "./db";
import { emailLayout, sendEmail } from "./email";

/** Returns true if `date` falls on the same calendar day as `ref` + 1 day. */
export function isTomorrow(date: Date, ref = new Date()): boolean {
  const t = new Date(ref);
  t.setDate(t.getDate() + 1);
  return (
    date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate()
  );
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function fmtTime(d: Date): string {
  return new Date(d).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Sends reminder emails for every bilbingo occasion happening tomorrow:
 *  - to assigned families (funktionärer) that have an email
 *  - to the kvällsansvarig (if it matches a family email; lead has no email
 *    field, so we include it in the body for everyone instead)
 * Idempotent per occasion via a systemSettings marker, so running the cron
 * multiple times a day won't double-send. `force` bypasses the marker.
 */
export async function sendBilbingoReminders(now = new Date(), force = false) {
  const year = now.getFullYear();
  // Check this year's and next year's occasions to be safe around new year.
  const occasions = [
    ...(await db.listOccasions(year)),
    ...(await db.listOccasions(year + 1)),
  ];

  let totalSent = 0;
  const handled: number[] = [];

  for (const occ of occasions) {
    if (!isTomorrow(new Date(occ.occasionDate), now)) continue;

    const markerKey = `bingo_reminder_sent_${occ.id}`;
    if (!force) {
      const marker = await db.getSetting(markerKey);
      if (marker?.settingValue) continue; // already sent
    }

    const fams = await db.getFamiliesForOccasion(occ.id);
    const dateStr = fmtDate(new Date(occ.occasionDate));
    const timeStr = fmtTime(new Date(occ.occasionDate));
    const leadLine = occ.leadName
      ? `<p>Kvällsansvarig: <strong>${occ.leadName}</strong>${
          occ.leadPhone ? ` (${occ.leadPhone})` : ""
        }</p>`
      : "";

    let sentForThis = 0;
    for (const f of fams) {
      if (!f.email) continue;
      const body = `
        <p>Hej ${f.parentName}!</p>
        <p>Påminnelse: du är funktionär på <strong>bilbingon imorgon</strong>,
        ${dateStr}, kl ${timeStr}${occ.location ? ` vid ${occ.location}` : ""}.</p>
        ${leadLine}
        <p>Tack för att du hjälper till — det gör bilbingon möjlig!</p>
      `;
      const res = await sendEmail({
        to: f.email,
        subject: `Påminnelse: bilbingo imorgon (${dateStr})`,
        html: emailLayout("Din bilbingo-kväll imorgon", body),
      });
      if (res.sent) {
        totalSent++;
        sentForThis++;
      }
    }

    // Separate reminder to the kvällsansvarig (if they have an email).
    if (occ.leadEmail) {
      const leadBody = `
        <p>Hej ${occ.leadName || ""}!</p>
        <p>Du är <strong>kvällsansvarig</strong> för bilbingon imorgon,
        ${dateStr}, kl ${timeStr}${occ.location ? ` vid ${occ.location}` : ""}.</p>
        <p>Antal funktionärer inbokade: <strong>${fams.length}</strong>.</p>
        <p>Tack för att du leder kvällen!</p>
      `;
      const res = await sendEmail({
        to: occ.leadEmail,
        subject: `Du är kvällsansvarig för bilbingo imorgon (${dateStr})`,
        html: emailLayout("Kvällsansvarig imorgon", leadBody),
      });
      if (res.sent) totalSent++;
    }

    // Mark as handled so we don't resend (only when not forcing).
    await db.setSetting(markerKey, new Date().toISOString());
    handled.push(occ.id);
    void sentForThis;
  }

  return { ok: true, occasions: handled.length, sent: totalSent };
}
