import { FEATURES } from "@shared/const";
import { z } from "zod";
import * as db from "../db";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { assertFunctionary } from "../_core/functionary";
import { notifyTopicLater } from "../push";

const SEASON_KEY = "active_season";
const BINGO_INFO_KEY = "bilbingo_info";
const RINK_CLOSED_KEY = "rink_closed";

export const settingsRouter = router({
  // Public: manual "rink closed" message (empty = open as normal).
  getRinkClosed: publicProcedure.query(async () => {
    const row = await db.getSetting(RINK_CLOSED_KEY);
    return { message: row?.settingValue ?? "" } as const;
  }),

  // Rink functionaries: close the rink with a message, or reopen (empty).
  setRinkClosed: protectedProcedure
    .input(z.object({ message: z.string().trim().max(200) }))
    .mutation(async ({ ctx, input }) => {
      await assertFunctionary(ctx.user, "hockeyrink");
      const wasClosed = Boolean((await db.getSetting(RINK_CLOSED_KEY))?.settingValue);
      await db.setSetting(RINK_CLOSED_KEY, input.message || null);
      if (input.message) {
        notifyTopicLater(
          "rink_closed",
          { title: "Rinken är stängd 🔴", body: input.message, url: "/" },
          { throttleMs: 30 * 60 * 1000 }
        );
      } else if (wasClosed) {
        notifyTopicLater(
          "rink_closed",
          { title: "Rinken är öppen igen 🟢", body: "Välkommen ut på isen!", url: "/" },
          { throttleMs: 30 * 60 * 1000, throttleKey: "open" }
        );
      }
      return { message: input.message } as const;
    }),

  // Public: read the active season (defaults to "vinter").
  getSeason: publicProcedure.query(async () => {
    // Summer mode only exists for bilbingo; without it the site is always winter.
    if (!FEATURES.bilbingo) return { season: "vinter" } as const;
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
