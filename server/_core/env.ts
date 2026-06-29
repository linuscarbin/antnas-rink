export const ENV = {
  // Session signing secret (JWT). Generate with: openssl rand -hex 32
  cookieSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Email (Resend) — used for duty reminders and conflict alerts.
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "Antnäs Hockeyrink <onboarding@resend.dev>",

  // Public site base URL (used in email links). Optional.
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "",

  // Weekly duty reminder cron (node-cron, 5-field, server local time).
  // Default: Mondays at 07:00. Set empty to disable.
  dutyReminderCron: process.env.DUTY_REMINDER_CRON ?? "0 7 * * 1",

  // Directory where uploaded board images are stored. In Coolify, mount a
  // persistent volume here so images survive restarts/redeploys.
  // Falls back to a local ./uploads folder when /data is not writable (dev).
  uploadDir:
    process.env.UPLOAD_DIR ??
    (process.env.NODE_ENV === "production" ? "/data/uploads" : "./uploads"),
};
