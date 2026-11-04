import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { randomBytes } from "crypto";
import { displayName, normalizePhone, whatsappNumber } from "@shared/user";
import { accountLink, ADMIN_RESET_TTL_MS, INVITE_TTL_MS, issueAccountToken } from "../accounts";
import { hashPassword } from "../_core/auth";
import { assertEmailFree } from "./auth";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

/** Never send password hashes or link tokens to the browser. */
function publicUser<T extends { passwordHash?: string; accountTokenHash?: string | null }>(u: T) {
  const { passwordHash: _p, accountTokenHash: _t, ...rest } = u;
  return rest;
}

export const usersRouter = router({
  // Logged-in: update your own profile (name + phone for duty contact).
  updateMe: protectedProcedure
    .input(
      z.object({
        name: z.string().max(120).optional(),
        phone: z.string().max(40).optional(),
        email: z.string().trim().email().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.phone && !normalizePhone(input.phone)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Telefonnumret ser inte rätt ut." });
      }
      if (input.phone) {
        const taken = (await db.getUsersByPhone(input.phone)).some((u) => u.id !== ctx.user.id);
        if (taken) throw new TRPCError({ code: "CONFLICT", message: "Telefonnumret används redan av ett annat konto." });
      }
      if (input.email !== undefined) await assertEmailFree(input.email || null, ctx.user.id);
      if (input.email === "" && !input.phone && !ctx.user.phone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Kontot behöver telefonnummer eller e-post." });
      }
      await db.updateUserProfile(ctx.user.id, {
        name: input.name,
        phone: input.phone,
        ...(input.email !== undefined ? { email: input.email || null } : {}),
      });
      const u = await db.getUserById(ctx.user.id);
      return u ? publicUser(u) : null;
    }),

  // Admin: members (with contact details) for duty assignment dropdowns.
  listForAssignment: adminProcedure.query(async () => {
    const users = await db.listUsers();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
    }));
  }),

  // Admin: full user list with account status and team memberships.
  list: adminProcedure.query(async () => {
    const [users, teams] = await Promise.all([db.listUsers(), db.listRinkTeams()]);
    return users.map((u) => ({
      ...publicUser(u),
      teams: teams
        .filter((t) => t.members.some((m) => m.userId === u.id))
        .map((t) => ({ name: t.name, area: t.area })),
      hasPendingLink:
        Boolean(u.accountTokenHash) &&
        Boolean(u.accountTokenExpiresAt && new Date(u.accountTokenExpiresAt).getTime() > Date.now()),
    }));
  }),

  // Admin: create many accounts at once (e.g. pasted from the WhatsApp group)
  // and optionally put them in a duty team. People then get a personal link.
  bulkCreate: adminProcedure
    .input(
      z.object({
        people: z
          .array(z.object({ name: z.string().trim().min(1).max(120), phone: z.string().trim().max(40) }))
          .min(1)
          .max(200),
        teamId: z.number().int().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const team = input.teamId ? await db.getRinkTeam(input.teamId) : undefined;
      const teamMembers = team ? await db.listTeamMembers(team.id) : [];
      const results: { name: string; phone: string; userId: number | null; status: "created" | "exists" | "invalid" }[] = [];
      for (const p of input.people) {
        const phone = normalizePhone(p.phone);
        if (!phone) {
          results.push({ name: p.name, phone: p.phone, userId: null, status: "invalid" });
          continue;
        }
        let user = (await db.getUsersByPhone(phone))[0];
        let status: "created" | "exists" = "exists";
        if (!user) {
          user = (await db.createUser({
            name: p.name,
            phone,
            email: null,
            // Unusable until they pick their own password via their link.
            passwordHash: await hashPassword(randomBytes(32).toString("hex")),
            passwordSet: false,
            role: "user",
          }))!;
          status = "created";
        }
        if (team && !teamMembers.some((m) => m.userId === user.id)) {
          await db.addRinkTeamMember({ teamId: team.id, userId: user.id, name: displayName(user), phone: user.phone });
          teamMembers.push({ userId: user.id } as (typeof teamMembers)[number]);
        }
        results.push({ name: p.name, phone, userId: user.id, status });
      }
      return results;
    }),

  // Admin: personal link for a user – invite (no password yet, 14 days) or a
  // new-password link (2 hours). Ready to send via WhatsApp.
  accountLink: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Användaren finns inte." });
      const isInvite = !user.passwordSet;
      const token = await issueAccountToken(user.id, isInvite ? INVITE_TTL_MS : ADMIN_RESET_TTL_MS);
      const url = accountLink(ctx.req, token);
      const first = (user.name ?? "").split(" ")[0];
      const text = isInvite
        ? `Hej${first ? ` ${first}` : ""}! Här är ditt konto till Antnäs Vinter – rinken och skidspåret. Tryck på länken och välj ett lösenord: ${url}`
        : `Hej${first ? ` ${first}` : ""}! Här är en länk för att välja nytt lösenord till Antnäs Vinter (gäller i 3 dagar): ${url}`;
      const wa = whatsappNumber(user.phone);
      return {
        url,
        text,
        isInvite,
        whatsappUrl: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : null,
      };
    }),

  // Admin: change a user's role. Protects the project owner from demotion.
  setRole: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const target = await db.getUserById(input.id);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Användare hittades inte." });
      }
      if (target.id === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Du kan inte ta bort din egen adminbehörighet.",
        });
      }
      await db.setUserRole(input.id, input.role);
      return { success: true } as const;
    }),
});
