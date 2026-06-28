import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  createHeartbeatJob,
  deleteHeartbeatJob,
  updateHeartbeatJob,
} from "../_core/heartbeat";
import * as db from "../db";
import { adminProcedure, router } from "../_core/trpc";

const REMINDER_KEY = "duty_reminder_cron";

export const scheduleRouter = router({
  // Admin: read current reminder schedule config.
  get: adminProcedure.query(async () => {
    const setting = await db.getSetting(REMINDER_KEY);
    return {
      enabled: Boolean(setting?.scheduleCronTaskUid),
      cron: setting?.settingValue ?? null,
      taskUid: setting?.scheduleCronTaskUid ?? null,
    };
  }),

  // Admin: enable/update the weekly duty reminder email.
  // `cron` is a 6-field UTC expression; default Monday 07:00 UTC.
  setReminder: adminProcedure
    .input(
      z.object({
        cron: z.string().min(9).default("0 0 7 * * 1"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sessionToken =
        parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      const existing = await db.getSetting(REMINDER_KEY);

      if (existing?.scheduleCronTaskUid) {
        await updateHeartbeatJob(
          existing.scheduleCronTaskUid,
          { cron: input.cron, enable: true },
          sessionToken
        );
        await db.setSetting(REMINDER_KEY, input.cron, existing.scheduleCronTaskUid);
        return { success: true, taskUid: existing.scheduleCronTaskUid } as const;
      }

      const job = await createHeartbeatJob(
        {
          name: "antnas-duty-reminder",
          cron: input.cron,
          path: "/api/scheduled/dutyReminder",
          description: "Veckopåminnelse till plog-/spoljour",
        },
        sessionToken
      );
      await db.setSetting(REMINDER_KEY, input.cron, job.taskUid);
      return { success: true, taskUid: job.taskUid } as const;
    }),

  // Admin: disable the reminder.
  disableReminder: adminProcedure.mutation(async ({ ctx }) => {
    const sessionToken =
      parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    const existing = await db.getSetting(REMINDER_KEY);
    if (existing?.scheduleCronTaskUid) {
      await deleteHeartbeatJob(existing.scheduleCronTaskUid, sessionToken);
      await db.setSetting(REMINDER_KEY, null, null);
    }
    return { success: true } as const;
  }),
});
