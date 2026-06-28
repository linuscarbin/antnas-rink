import { ENV } from "../_core/env";
import { adminProcedure, router } from "../_core/trpc";
import { sendWeeklyDutyReminders } from "../dutyReminder";

export const scheduleRouter = router({
  // Admin: read the configured reminder schedule (set via env at deploy time).
  get: adminProcedure.query(async () => {
    const cron = ENV.dutyReminderCron?.trim() ?? "";
    return {
      enabled: Boolean(cron),
      cron: cron || null,
    };
  }),

  // Admin: trigger this week's duty reminder emails immediately (manual run).
  runNow: adminProcedure.mutation(async () => {
    const result = await sendWeeklyDutyReminders();
    return result;
  }),
});
