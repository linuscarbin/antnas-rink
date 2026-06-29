import { getIsoWeek } from "@shared/rink";
import * as db from "./db";
import { emailLayout, sendEmail } from "./email";

/**
 * Sends reminder emails to this week's duty holders:
 * rink plogjour/spoljour AND ski-track spårjour (a separate group).
 * Each area is handled independently, so spårjour is reminded even on weeks
 * with no rink duty, and vice versa. Returns a summary.
 */
export async function sendWeeklyDutyReminders(now = new Date()) {
  const { year, week } = getIsoWeek(now);

  const recipients: {
    email: string;
    role: string;
    name: string;
    area: "rink" | "skidspår";
    note: string | null;
  }[] = [];

  const addRecipient = async (
    userId: number | null,
    roleLabel: string,
    fallbackName: string | null,
    area: "rink" | "skidspår",
    note: string | null
  ) => {
    if (!userId) return;
    const u = await db.getUserById(userId);
    if (u?.email) {
      recipients.push({
        email: u.email,
        role: roleLabel,
        name: u.name || fallbackName || "",
        area,
        note,
      });
    }
  };

  // Rink duty (plogjour / spoljour).
  const duty = await db.getDuty(year, week);
  if (duty) {
    await addRecipient(duty.plogjourUserId, "Plogjour", duty.plogjourName, "rink", duty.note);
    await addRecipient(duty.spoljourUserId, "Spoljour", duty.spoljourName, "rink", duty.note);
  }

  // Ski-track duty (spårjour) — independent of rink duty.
  const skiDuty = await db.getSkiDuty(year, week);
  if (skiDuty) {
    await addRecipient(
      skiDuty.sparjourUserId,
      "Spårjour",
      skiDuty.sparjourName,
      "skidspår",
      skiDuty.note
    );
  }

  let sent = 0;
  for (const r of recipients) {
    const areaText =
      r.area === "rink"
        ? "Tänk på att hålla rinken i skick och uppdatera statusen när du har plogat eller spolat."
        : "Tänk på att dra spåret vid behov och uppdatera spårstatus och spårskick.";
    const body = `
      <p>Hej ${r.name || ""}!</p>
      <p>Du står som <strong>${r.role.toLowerCase()}</strong> för Antnäs ${r.area} denna vecka (vecka ${week}, ${year}).</p>
      <p>${areaText}</p>
      ${r.note ? `<p>Notering: ${r.note}</p>` : ""}
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
