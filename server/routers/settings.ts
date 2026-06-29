import { z } from "zod";
import * as db from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const SEASON_KEY = "active_season";
const BINGO_INFO_KEY = "bilbingo_info";

export const settingsRouter = router({
  // Public: read the active season (defaults to "vinter").
  getSeason: publicProcedure.query(async () => {
    const row = await db.getSetting(SEASON_KEY);
    const season = row?.settingValue === "sommar" ? "sommar" : "vinter";
    return { season } as const;
  }),

  // Admin: switch the active season.
  setSeason: adminProcedure
    .input(z.object({ season: z.enum(["vinter", "sommar"]) }))
    .mutation(async ({ input }) => {
      await db.setSetting(SEASON_KEY, input.season);
      return { season: input.season } as const;
    }),

  // Public: read the editable bilbingo info (markdown text).
  getBingoInfo: publicProcedure.query(async () => {
    const row = await db.getSetting(BINGO_INFO_KEY);
    return { text: row?.settingValue ?? "" } as const;
  }),

  // Admin: update the bilbingo info text.
  setBingoInfo: adminProcedure
    .input(z.object({ text: z.string().max(5000) }))
    .mutation(async ({ input }) => {
      await db.setSetting(BINGO_INFO_KEY, input.text);
      return { success: true } as const;
    }),
});
