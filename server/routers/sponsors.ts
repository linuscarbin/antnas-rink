import { z } from "zod";
import * as db from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

/** Only http(s) links, so a sponsor link can never run script. */
const link = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v && !/^[a-z]+:/i.test(v) ? `https://${v}` : v))
  .refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v), "Länken ser inte rätt ut.");

const fields = z.object({
  name: z.string().trim().min(1, "Skriv sponsorns namn.").max(120),
  logoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  text: z.string().trim().max(300).optional().or(z.literal("")),
  url: link.optional().or(z.literal("")),
  tier: z.enum(["huvud", "sponsor"]),
  area: z.enum(["alla", "hockeyrink", "skidspar"]),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

const clean = (d: z.infer<typeof fields>) => ({
  ...d,
  logoUrl: d.logoUrl || null,
  text: d.text || null,
  url: d.url || null,
});

export const sponsorsRouter = router({
  // Public: active sponsors.
  list: publicProcedure.query(() => db.listSponsors(true)),

  // Admin: all, including hidden ones.
  adminList: adminProcedure.query(() => db.listSponsors(false)),

  create: adminProcedure.input(fields).mutation(async ({ input }) => db.createSponsor(clean(input))),

  update: adminProcedure
    .input(fields.extend({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateSponsor(id, clean(data));
      return { success: true } as const;
    }),

  delete: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    await db.deleteSponsor(input.id);
    return { success: true } as const;
  }),
});
