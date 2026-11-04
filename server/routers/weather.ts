import { ANTNAS_LAT, ANTNAS_LON } from "@shared/rink";
import { publicProcedure, router } from "../_core/trpc";

export type WeatherResult = {
  temperature: number | null;
  /** Mean wind, m/s. */
  windSpeed: number | null;
  /** Wind gusts, m/s. */
  windGusts: number | null;
  time: string | null;
  /** Which model answered (for transparency). */
  source: string | null;
  ok: boolean;
};

const EMPTY: WeatherResult = {
  temperature: null,
  windSpeed: null,
  windGusts: null,
  time: null,
  source: null,
  ok: false,
};

// Simple in-memory cache to avoid hammering Open-Meteo (10 min TTL).
let cache: { at: number; data: WeatherResult } | null = null;
const TTL_MS = 10 * 60 * 1000;

/**
 * Builds the Open-Meteo request. Wind in m/s (the API defaults to km/h,
 * which is why 5 m/s used to show as "19 m/s").
 */
export function weatherUrl(model?: string): URL {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(ANTNAS_LAT));
  url.searchParams.set("longitude", String(ANTNAS_LON));
  url.searchParams.set("current", "temperature_2m,wind_speed_10m,wind_gusts_10m");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("timezone", "Europe/Stockholm");
  if (model) url.searchParams.set("models", model);
  return url;
}

type OpenMeteoCurrent = {
  current?: {
    temperature_2m?: number | null;
    wind_speed_10m?: number | null;
    wind_gusts_10m?: number | null;
    time?: string;
  };
};

async function fetchModel(model?: string): Promise<WeatherResult | null> {
  const resp = await fetch(weatherUrl(model), { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return null;
  const c = ((await resp.json()) as OpenMeteoCurrent).current;
  if (c?.temperature_2m == null) return null;
  return {
    temperature: c.temperature_2m,
    windSpeed: c.wind_speed_10m ?? null,
    windGusts: c.wind_gusts_10m ?? null,
    time: c.time ?? null,
    source: model === "metno_seamless" ? "MET Nordic" : "Open-Meteo",
    ok: true,
  };
}

export const weatherRouter = router({
  current: publicProcedure.query(async (): Promise<WeatherResult> => {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return cache.data;
    }
    try {
      // MET Nordic (1 km, corrected with observations) is the best model for
      // northern Sweden; fall back to Open-Meteo's default if it's missing.
      const data = (await fetchModel("metno_seamless").catch(() => null)) ?? (await fetchModel());
      if (!data) return EMPTY;
      cache = { at: Date.now(), data };
      return data;
    } catch (error) {
      console.warn("[Weather] Open-Meteo fetch failed:", error);
      return EMPTY;
    }
  }),
});
