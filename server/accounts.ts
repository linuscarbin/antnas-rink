import { createHash, randomBytes } from "crypto";
import type { Request } from "express";
import { isEmail, normalizePhone } from "@shared/user";
import * as db from "./db";
import { emailLayout, esc, sendEmail } from "./email";
import { ENV, isMailConfigured } from "./_core/env";

const DAY = 24 * 3600 * 1000;
export const INVITE_TTL_MS = 14 * DAY;
export const RESET_TTL_MS = 2 * 3600 * 1000;
/** Admin-sent new-password links (via WhatsApp) – people don't always read at once. */
export const ADMIN_RESET_TTL_MS = 3 * DAY;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a one-time link token (only its hash is stored). */
export async function issueAccountToken(userId: number, ttlMs: number): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await db.setAccountToken(userId, hashToken(token), new Date(Date.now() + ttlMs));
  return token;
}

/** The user a still-valid link token belongs to, if any. */
export async function userForToken(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return undefined;
  const user = await db.getUserByTokenHash(hashToken(token));
  if (!user || !user.accountTokenExpiresAt) return undefined;
  if (new Date(user.accountTokenExpiresAt).getTime() < Date.now()) return undefined;
  return user;
}

/** Public site address for links (PUBLIC_BASE_URL, else the request's host). */
export function baseUrl(req: Request): string {
  if (ENV.publicBaseUrl) return ENV.publicBaseUrl.replace(/\/+$/, "");
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "localhost";
  return `${req.protocol}://${host}`;
}

export const accountLink = (req: Request, token: string) => `${baseUrl(req)}/konto/${token}`;

/**
 * Finds the user for a login identifier: e-mail, or phone in any format.
 * Ambiguous phone numbers (shared by several accounts) match nobody.
 */
export async function findUserByIdentifier(identifier: string) {
  const id = identifier.trim();
  if (isEmail(id)) return db.getUserByEmail(id);
  if (!normalizePhone(id)) return undefined;
  const matches = await db.getUsersByPhone(id);
  return matches.length === 1 ? matches[0] : undefined;
}

/** E-mails a password reset link. Returns false if it can't be e-mailed. */
export async function sendResetEmail(
  req: Request,
  user: { id: number; email: string | null; name: string | null }
): Promise<boolean> {
  if (!user.email || !isMailConfigured()) return false;
  const token = await issueAccountToken(user.id, RESET_TTL_MS);
  const link = accountLink(req, token);
  const result = await sendEmail({
    to: user.email,
    subject: "Välj nytt lösenord – Antnäs Vinter",
    html: emailLayout(
      "Välj nytt lösenord",
      `<p>Hej ${esc(user.name ?? "")}!</p>
       <p>Någon (förhoppningsvis du) bad om ett nytt lösenord till Antnäs Vinter.</p>
       <p><a href="${esc(link)}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:700">Välj nytt lösenord</a></p>
       <p style="color:#64748b;font-size:13px">Länken gäller i 2 timmar och kan bara användas en gång. Har du inte bett om detta kan du strunta i mejlet.</p>`
    ),
    text: `Välj nytt lösenord: ${link} (gäller i 2 timmar)`,
  });
  return result.sent;
}
