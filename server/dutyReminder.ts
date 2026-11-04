import { getIsoWeek } from "@shared/rink";
import * as db from "./db";
import { emailLayout, esc, sendEmail } from "./email";
import { notifyTopic } from "./push";

/**
 * Sends reminder emails to this week's duty holders:
 * rink plogjour/spoljour AND ski-track spårjour (a separate group).
 * Each area is handled independently, so spårjour is reminded even on weeks
 * with no rink duty, and vice versa. Returns a summary.
 */
export async function sendWeeklyDutyReminders(now = new Date()) {
  const { year, week } = getIsoWeek(now);

  const recipients: {
    userId: number;
    email: string | null;
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
    // Everyone gets the push; e-mail only if the account has one.
    if (u && !recipients.some((r) => r.userId === u.id && r.area === area)) {
      recipients.push({
        userId: u.id,
        email: u.email,
        role: roleLabel,
        name: u.name || fallbackName || "",
        area,
        note,
      });
    }
  };

  // Rink duty: the week's rinkjour team (or legacy plog-/spoljour).
  const duty = await db.getDuty(year, week);
  if (duty?.teamId) {
    const absent = new Set(
      (await db.listAbsences(year)).filter((a) => a.week === week).map((a) => a.memberId)
    );
    for (const m of await db.listTeamMembers(duty.teamId)) {
      if (!absent.has(m.id)) await addRecipient(m.userId, "Rinkjour", m.name, "rink", duty.note);
    }
  } else if (duty) {
    await addRecipient(duty.plogjourUserId, "Plogjour", duty.plogjourName, "rink", duty.note);
    await addRecipient(duty.spoljourUserId, "Spoljour", duty.spoljourName, "rink", duty.note);
  }

  // Ski-track duty (spårjour) — independent of rink duty.
  const skiDuty = await db.getSkiDuty(year, week);
  if (skiDuty?.teamId) {
    const absent = new Set(
      (await db.listAbsences(year)).filter((a) => a.week === week).map((a) => a.memberId)
    );
    for (const m of await db.listTeamMembers(skiDuty.teamId)) {
      if (!absent.has(m.id)) await addRecipient(m.userId, "Spårjour", m.name, "skidspår", skiDuty.note);
    }
  } else if (skiDuty) {
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
        ? "Ploga och spola efter behov, och markera plogad/spolad på sidan när ni är klara."
        : "Tänk på att dra spåret vid behov och uppdatera spårstatus och spårskick.";
    const body = `
      <p>Hej ${esc(r.name || "")}!</p>
      <p>Du står som <strong>${r.role.toLowerCase()}</strong> för Antnäs ${r.area} denna vecka (vecka ${week}, ${year}).</p>
      <p>${areaText}</p>
      ${r.note ? `<p>Notering: ${esc(r.note)}</p>` : ""}
    `;
    const result = await sendEmail({
      to: r.email ?? [],
      subject: `Påminnelse: din ${r.role.toLowerCase()} vecka ${week}`,
      html: emailLayout(`Din ${r.role.toLowerCase()} denna vecka`, body),
    });
    if (result.sent) sent++;
    await notifyTopic(
      "duty_reminder",
      {
        title: `Din ${r.role.toLowerCase()} börjar 📅`,
        body: `Du har ${r.role.toLowerCase()} vecka ${week}. ${r.area === "rink" ? "Markera plogad/spolad när du är klar." : "Markera draget när du är klar."}`,
        url: r.area === "rink" ? "/?flik=jour" : "/skidspar?flik=jour",
      },
      { userIds: [r.userId] }
    ).catch((e) => console.warn("[Push] duty reminder failed", e));
  }

  return { ok: true, year, week, recipients: recipients.length, sent };
}
