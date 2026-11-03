import { FEATURES } from "@shared/const";
import cron from "node-cron";
import { sendBilbingoReminders } from "../bingoReminder";
import { sendWeeklyDutyReminders } from "../dutyReminder";
import { runSnowAlert } from "../snowAlert";
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

  schedule("Duty reminder", ENV.dutyReminderCron, "DUTY_REMINDER_CRON", sendWeeklyDutyReminders);
  schedule("Snow alert", ENV.snowAlertCron, "SNOW_ALERT_CRON", runSnowAlert);
  if (FEATURES.bilbingo) {
    schedule(
      "Bilbingo reminder",
      ENV.bingoReminderCron || "0 17 * * *",
      "BINGO_REMINDER_CRON",
      sendBilbingoReminders
    );
  }
}

/** Schedules one job; empty expression disables it. Jobs run in Swedish time. */
function schedule(
  name: string,
  expression: string | undefined,
  envName: string,
  job: () => Promise<unknown>
) {
  const expr = expression?.trim();
  if (!expr) {
    console.log(`[Scheduler] ${name} disabled (${envName} empty).`);
    return;
  }
  if (!cron.validate(expr)) {
    console.warn(`[Scheduler] Invalid ${envName} "${expr}" — skipping.`);
    return;
  }
  cron.schedule(
    expr,
    async () => {
      try {
        const result = await job();
        console.log(`[Scheduler] ${name} run:`, JSON.stringify(result));
      } catch (error) {
        console.error(`[Scheduler] ${name} failed:`, error);
      }
    },
    { timezone: "Europe/Stockholm" }
  );
  console.log(`[Scheduler] ${name} scheduled with cron "${expr}".`);
}
