import { ANTNAS_LAT, ANTNAS_LON, getIsoWeek } from "@shared/rink";
import * as db from "./db";
import { ENV } from "./_core/env";
import { notifyTopic } from "./push";

/** Sum of hourly snowfall (cm) for the 24 hours before `now`. Pure, testable. */
export function snowLast24h(times: string[], cm: (number | null)[], now: Date): number {
  const end = now.getTime();
  const start = end - 24 * 3600 * 1000;
  let sum = 0;
  times.forEach((t, i) => {
    // Open-Meteo returns "YYYY-MM-DDTHH:MM" in UTC when timezone=GMT.
    const at = Date.parse(`${t}:00Z`);
    if (at > start && at <= end) sum += cm[i] ?? 0;
  });
  return Math.round(sum * 10) / 10;
}

/**
 * Morning check: if it snowed a lot during the last 24h, ping functionaries
 * (snow_alert topic) that plowing is needed, naming this week's plogjour.
 */
export async function runSnowAlert(now = new Date()) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(ANTNAS_LAT));
  url.searchParams.set("longitude", String(ANTNAS_LON));
  url.searchParams.set("hourly", "snowfall");
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "GMT");
  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) return { ok: false, reason: `weather-${resp.status}` };
  const json = (await resp.json()) as { hourly?: { time: string[]; snowfall: (number | null)[] } };
  const cm = snowLast24h(json.hourly?.time ?? [], json.hourly?.snowfall ?? [], now);
  if (cm < ENV.snowAlertCm) return { ok: true, cm, notified: false };

  const { year, week } = getIsoWeek(now);
  const duty = await db.getDuty(year, week);
  const who = duty?.plogjourName ? ` Veckans plogjour: ${duty.plogjourName}.` : "";
  const result = await notifyTopic("snow_alert", {
    title: `❄️ ${cm} cm snö senaste dygnet`,
    body: `Rinken behöver troligen plogas.${who}`,
    url: "/",
  });
  return { ok: true, cm, notified: true, sent: result.sent };
}
