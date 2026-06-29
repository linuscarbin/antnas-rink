import cron from "node-cron";
import { sendBilbingoReminders } from "../bingoReminder";
import { sendWeeklyDutyReminders } from "../dutyReminder";
import { ENV } from "./env";

let started = false;

/**
 * Starts the in-process scheduler for recurring jobs.
 * Self-hosted (node-cron) — runs inside the same container, no external
 * platform required. Suitable for a single always-on instance (Coolify).
 */
export function startScheduler() {
  if (started) return;
  started = true;

  const expr = ENV.dutyReminderCron?.trim();
  if (!expr) {
    console.log("[Scheduler] Duty reminder disabled (DUTY_REMINDER_CRON empty).");
    return;
  }

  if (!cron.validate(expr)) {
    console.warn(`[Scheduler] Invalid DUTY_REMINDER_CRON "${expr}" — skipping.`);
    return;
  }

  cron.schedule(expr, async () => {
    try {
      const result = await sendWeeklyDutyReminders();
      console.log("[Scheduler] Duty reminders run:", JSON.stringify(result));
    } catch (error) {
      console.error("[Scheduler] Duty reminder failed:", error);
    }
  });

  console.log(`[Scheduler] Duty reminder scheduled with cron "${expr}".`);

  // Bilbingo reminders: run daily at 17:00 server time, emailing funktionärer
  // and kvällsansvarig the day before each occasion. Configurable via env.
  const bingoExpr = (ENV.bingoReminderCron || "0 17 * * *").trim();
  if (bingoExpr && cron.validate(bingoExpr)) {
    cron.schedule(bingoExpr, async () => {
      try {
        const result = await sendBilbingoReminders();
        console.log("[Scheduler] Bilbingo reminders run:", JSON.stringify(result));
      } catch (error) {
        console.error("[Scheduler] Bilbingo reminder failed:", error);
      }
    });
    console.log(`[Scheduler] Bilbingo reminder scheduled with cron "${bingoExpr}".`);
  }
}
