import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import {
  createSessionToken,
  hashPassword,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from "../_core/auth";
import { getSessionCookieOptions } from "../_core/cookies";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

function sanitize(user: {
  id: number;
  email: string;
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

export const authRouter = router({
  // Current user (null if not logged in).
  me: publicProcedure.query(({ ctx }) => (ctx.user ? sanitize(ctx.user) : null)),

  // Register a new account. The very first account becomes admin (owner).
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8, "Lösenordet måste vara minst 8 tecken."),
        name: z.string().min(1).max(120),
        phone: z.string().max(40).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Det finns redan ett konto med den e-postadressen.",
        });
      }

      const isFirstUser = (await db.countUsers()) === 0;
      const passwordHash = await hashPassword(input.password);
      const user = await db.createUser({
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone ?? null,
        role: isFirstUser ? "admin" : "user",
      });

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Kunde inte skapa kontot.",
        });
      }

      const token = createSessionToken(user.id);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: SESSION_TTL_SECONDS * 1000,
      });

      return { ...sanitize(user), token };
    }),

  // Log in with email + password.
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Fel e-post eller lösenord.",
        });
      }
      const ok = await verifyPassword(input.password, user.passwordHash);
      if (!ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Fel e-post eller lösenord.",
        });
      }

      await db.touchUserSignIn(user.id);
      const token = createSessionToken(user.id);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: SESSION_TTL_SECONDS * 1000,
      });

      return { ...sanitize(user), token };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  // Change own password.
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fresh = await db.getUserById(ctx.user.id);
      if (!fresh) throw new TRPCError({ code: "NOT_FOUND" });
      const ok = await verifyPassword(input.currentPassword, fresh.passwordHash);
      if (!ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Nuvarande lösenord stämmer inte.",
        });
      }
      const passwordHash = await hashPassword(input.newPassword);
      await db.setUserPassword(ctx.user.id, passwordHash);
      return { success: true } as const;
    }),
});
