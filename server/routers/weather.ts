import { ANTNAS_LAT, ANTNAS_LON } from "@shared/rink";
import { publicProcedure, router } from "../_core/trpc";

type WeatherResult = {
  temperature: number | null;
  windSpeed: number | null;
  time: string | null;
  ok: boolean;
};

// Simple in-memory cache to avoid hammering Open-Meteo (10 min TTL).
let cache: { at: number; data: WeatherResult } | null = null;
const TTL_MS = 10 * 60 * 1000;

export const weatherRouter = router({
  current: publicProcedure.query(async (): Promise<WeatherResult> => {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return cache.data;
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(ANTNAS_LAT));
    url.searchParams.set("longitude", String(ANTNAS_LON));
    url.searchParams.set("current", "temperature_2m,wind_speed_10m");
    url.searchParams.set("timezone", "Europe/Stockholm");

    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) {
        return { temperature: null, windSpeed: null, time: null, ok: false };
      }
      const json = (await resp.json()) as {
        current?: {
          temperature_2m?: number;
          wind_speed_10m?: number;
          time?: string;
        };
      };
      const data: WeatherResult = {
        temperature: json.current?.temperature_2m ?? null,
        windSpeed: json.current?.wind_speed_10m ?? null,
        time: json.current?.time ?? null,
        ok: true,
      };
      cache = { at: Date.now(), data };
      return data;
    } catch (error) {
      console.warn("[Weather] Open-Meteo fetch failed:", error);
      return { temperature: null, windSpeed: null, time: null, ok: false };
    }
  }),
});
