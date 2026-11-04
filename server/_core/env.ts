import { randomBytes } from "crypto";

function resolveJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured && configured.length >= 16) return configured;
  if (process.env.NODE_ENV === "production") {
    // Never fall back to a well-known secret in production: anyone could forge
    // sessions. A random per-process secret is safe (users just get logged out
    // on restart) until JWT_SECRET is configured.
    console.error(
      "[Security] JWT_SECRET saknas eller är för kort (minst 16 tecken). " +
        "Använder en tillfällig slumpad nyckel – alla loggas ut vid omstart. " +
        "Sätt JWT_SECRET (openssl rand -hex 32) i Coolify."
    );
    return randomBytes(32).toString("hex");
  }
  return configured || "dev-insecure-secret-change-me";
}

export const ENV = {
  // Session signing secret (JWT). Generate with: openssl rand -hex 32
  cookieSecret: resolveJwtSecret(),
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

  // Web Push (VAPID). Optional: keys are generated and stored in the DB if
  // not provided. Subject should be a mailto: or https: URL.
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    subject: process.env.VAPID_SUBJECT ?? "",
  },

  // Snow alert to functionaries (cron, Swedish time) and threshold in cm.
  snowAlertCron: process.env.SNOW_ALERT_CRON ?? "5 7 * * *",
  snowAlertCm: Number(process.env.SNOW_ALERT_CM ?? 5),

  // Cloudflare R2 (S3-compatible) storage for board images.
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "",
    // Optional explicit S3 endpoint; defaults to the account-derived URL.
    endpoint: process.env.R2_ENDPOINT ?? "",
    // Public base URL where the bucket is served (your own domain),
    // e.g. https://media.jlco.app
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

/** True when e-mail can actually be sent (Resend API key configured). */
export function isMailConfigured(): boolean {
  return Boolean(ENV.resendApiKey);
}
