import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { isEmail, normalizePhone } from "@shared/user";
import {
  accountLink,
  findUserByIdentifier,
  issueAccountToken,
  RESET_TTL_MS,
  sendResetEmail,
  userForToken,
} from "../accounts";
import {
  createSessionToken,
  hashPassword,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from "../_core/auth";
import { getSessionCookieOptions } from "../_core/cookies";
import { functionaryAreas } from "../_core/functionary";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import * as db from "../db";

function sanitize(user: {
  id: number;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: "user" | "admin";
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
}

// Brute-force protection per IP within a window.
const WINDOW_MS = 15 * 60 * 1000;
const buckets = new Map<string, number[]>();
function hits(key: string): number[] {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  buckets.set(key, list);
  return list;
}
function limit(key: string, max: number, message: string) {
  if (hits(key).length >= max) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
  }
}

function startSession(ctx: TrpcContext, userId: number) {
  const token = createSessionToken(userId);
  ctx.res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
  return token;
}

const password = z.string().min(8, "Lösenordet måste vara minst 8 tecken.").max(200);

/** E-mail must be unique; phone number is normalized. */
async function assertEmailFree(email: string | null | undefined, exceptUserId?: number) {
  if (!email) return;
  const existing = await db.getUserByEmail(email);
  if (existing && existing.id !== exceptUserId) {
    throw new TRPCError({ code: "CONFLICT", message: "Det finns redan ett konto med den e-postadressen." });
  }
}

export const authRouter = router({
  // Current user (null if not logged in).
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const functionary = await functionaryAreas(ctx.user);
    return { ...sanitize(ctx.user), functionary };
  }),

  // Anyone can create an account. It only lets you book the rink and write on
  // the board – duty rights come from an admin adding you to a team.
  // The very first account becomes admin.
  register: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional(),
        password,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email || null;
      const phone = input.phone ? normalizePhone(input.phone) : null;
      if (input.phone && !phone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Telefonnumret ser inte rätt ut." });
      }
      if (!email && !phone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ange e-post eller telefonnummer." });
      }
      await assertEmailFree(email);
      if (phone && (await db.getUsersByPhone(phone)).length) {
        throw new TRPCError({ code: "CONFLICT", message: "Det finns redan ett konto med det telefonnumret." });
      }
      const isFirstUser = (await db.countUsers()) === 0;
      const user = await db.createUser({
        email,
        phone,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        role: isFirstUser ? "admin" : "user",
      });
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Kunde inte skapa kontot." });
      }
      return { ...sanitize(user), token: startSession(ctx, user.id) };
    }),

  // Log in with e-mail or phone number + password.
  login: publicProcedure
    .input(
      z.object({
        identifier: z.string().trim().min(3).max(320),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip ?? "unknown";
      limit(`login:${ip}`, 10, "För många misslyckade försök. Vänta en kvart och försök igen.");
      const user = await findUserByIdentifier(input.identifier);
      if (user && !user.passwordSet) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Du har inte valt lösenord än. Använd länken du fått, eller be en admin om en ny.",
        });
      }
      const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;
      if (!user || !ok) {
        hits(`login:${ip}`).push(Date.now());
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Fel telefonnummer/e-post eller lösenord.",
        });
      }
      buckets.delete(`login:${ip}`);
      await db.touchUserSignIn(user.id);
      return { ...sanitize(user), token: startSession(ctx, user.id) };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  // "Glömt lösenord": e-mails a link if the account has an e-mail address.
  // Always answers the same, so it can't be used to probe for accounts.
  requestPasswordReset: publicProcedure
    .input(z.object({ identifier: z.string().trim().min(3).max(320) }))
    .mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip ?? "unknown";
      limit(`reset:${ip}`, 5, "För många försök. Vänta en stund och försök igen.");
      hits(`reset:${ip}`).push(Date.now());
      const user = await findUserByIdentifier(input.identifier);
      if (user) {
        await sendResetEmail(ctx.req, user).catch((e) => console.warn("[Reset] mail failed:", e));
      }
      return {
        message:
          "Om kontot har en e-postadress har vi skickat en länk dit. Har du ingen e-post i kontot – be en admin om en ny länk.",
      };
    }),

  // Public: what a /konto/<token> link is (to show the right page).
  tokenInfo: publicProcedure
    .input(z.object({ token: z.string().max(100) }))
    .query(async ({ input }) => {
      const user = await userForToken(input.token);
      if (!user) return { valid: false as const };
      return {
        valid: true as const,
        isInvite: !user.passwordSet,
        name: user.name,
        email: user.email,
        phone: user.phone,
      };
    }),

  // Use an invite/reset link: choose a password (and optionally fill in
  // name and e-mail). Logs you in.
  useToken: publicProcedure
    .input(
      z.object({
        token: z.string().max(100),
        password,
        name: z.string().trim().min(1).max(120).optional(),
        email: z.string().trim().email().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip ?? "unknown";
      limit(`token:${ip}`, 20, "För många försök. Vänta en stund.");
      hits(`token:${ip}`).push(Date.now());
      const user = await userForToken(input.token);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Länken har gått ut eller redan använts. Be en admin om en ny.",
        });
      }
      const name = input.name?.trim() || user.name?.trim();
      if (!name) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Skriv ditt namn." });
      }
      if (input.email !== undefined) await assertEmailFree(input.email || null, user.id);
      await db.updateUserProfile(user.id, {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email !== undefined && input.email !== (user.email ?? "") ? { email: input.email || null } : {}),
      });
      if (input.name) await db.syncTeamMemberName(user.id, name);
      await db.setUserPassword(user.id, await hashPassword(input.password));
      await db.touchUserSignIn(user.id);
      const fresh = await db.getUserById(user.id);
      return { ...sanitize(fresh!), token: startSession(ctx, user.id) };
    }),

  // Change own password.
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: password }))
    .mutation(async ({ ctx, input }) => {
      const fresh = await db.getUserById(ctx.user.id);
      if (!fresh) throw new TRPCError({ code: "NOT_FOUND" });
      const ok = await verifyPassword(input.currentPassword, fresh.passwordHash);
      if (!ok) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Nuvarande lösenord stämmer inte." });
      }
      await db.setUserPassword(ctx.user.id, await hashPassword(input.newPassword));
      return { success: true } as const;
    }),
});

export { assertEmailFree };
