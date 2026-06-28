export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Email (Resend) — used for duty reminders and conflict alerts.
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "Antnäs Hockeyrink <onboarding@resend.dev>",
  // Public site base URL (used in email links). Optional.
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "",
};
