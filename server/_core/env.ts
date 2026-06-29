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

  // Daily cron for bilbingo reminders (day before each occasion).
  // Default: every day at 17:00 server time. Set empty to disable.
  bingoReminderCron: process.env.BINGO_REMINDER_CRON ?? "0 17 * * *",

  // Directory where uploaded board images are stored (disk fallback when R2
  // is not configured). In Coolify with R2 this is not needed.
  uploadDir:
    process.env.UPLOAD_DIR ??
    (process.env.NODE_ENV === "production" ? "/data/uploads" : "./uploads"),

  // Cloudflare R2 (S3-compatible) storage for board images.
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "",
    // Optional explicit S3 endpoint; defaults to the account-derived URL.
    endpoint: process.env.R2_ENDPOINT ?? "",
    // Public base URL where the bucket is served (your own domain),
    // e.g. https://media.antnasvinter.se
    publicUrl: process.env.R2_PUBLIC_URL ?? "",
  },
};

/** True when all required R2 settings are present. */
export function isR2Configured(): boolean {
  const r = ENV.r2;
  return Boolean(
    r.accessKeyId &&
      r.secretAccessKey &&
      r.bucket &&
      r.publicUrl &&
      (r.accountId || r.endpoint)
  );
}
