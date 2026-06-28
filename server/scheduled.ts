import type { Request, Response } from "express";
import { getIsoWeek } from "@shared/rink";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { emailLayout, sendEmail } from "./email";

/**
 * Heartbeat callback: sends a reminder email to this week's plogjour and
 * spoljour holders. Idempotent and safe to retry.
 *
 * Mounted at POST /api/scheduled/dutyReminder in server/_core/index.ts.
 */
export async function dutyReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const now = new Date();
    const { year, week } = getIsoWeek(now);
    const duty = await db.getDuty(year, week);

    if (!duty) {
      return res.json({ ok: true, skipped: "no-duty-this-week", year, week });
    }

    // Resolve recipient emails from linked user accounts (if any).
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

    let sentCount = 0;
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
      if (result.sent) sentCount++;
    }

    return res.json({ ok: true, year, week, recipients: recipients.length, sent: sentCount });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.originalUrl, taskUid: undefined },
      timestamp: new Date().toISOString(),
    });
  }
}
