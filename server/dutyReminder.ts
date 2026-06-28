import { getIsoWeek } from "@shared/rink";
import * as db from "./db";
import { emailLayout, sendEmail } from "./email";

/**
 * Sends reminder emails to this week's plogjour and spoljour holders
 * (the ones linked to a user account with an email). Returns a summary.
 * Idempotent enough to be safe if triggered more than once.
 */
export async function sendWeeklyDutyReminders(now = new Date()) {
  const { year, week } = getIsoWeek(now);
  const duty = await db.getDuty(year, week);

  if (!duty) {
    return { ok: true, skipped: "no-duty-this-week", year, week, sent: 0 };
  }

  const recipients: { email: string; role: string; name: string }[] = [];

  const addRecipient = async (
    userId: number | null,
    roleLabel: string,
    fallbackName: string | null
  ) => {
    if (!userId) return;
    const u = await db.getUserById(userId);
    if (u?.email) {
      recipients.push({
        email: u.email,
        role: roleLabel,
        name: u.name || fallbackName || "",
      });
    }
  };

  await addRecipient(duty.plogjourUserId, "Plogjour", duty.plogjourName);
  await addRecipient(duty.spoljourUserId, "Spoljour", duty.spoljourName);

  let sent = 0;
  for (const r of recipients) {
    const body = `
      <p>Hej ${r.name || ""}!</p>
      <p>Du står som <strong>${r.role.toLowerCase()}</strong> för Antnäs hockeyrink denna vecka (vecka ${week}, ${year}).</p>
      <p>Tänk på att hålla rinken i skick och uppdatera statusen när du har plogat eller spolat.</p>
      ${duty.note ? `<p>Notering: ${duty.note}</p>` : ""}
    `;
    const result = await sendEmail({
      to: r.email,
      subject: `Påminnelse: din ${r.role.toLowerCase()} vecka ${week}`,
      html: emailLayout(`Din ${r.role.toLowerCase()} denna vecka`, body),
    });
    if (result.sent) sent++;
  }

  return { ok: true, year, week, recipients: recipients.length, sent };
}
