// Shared rink-domain constants used by both client and server.

/** Booking zones — labels MUST stay exactly as specified. */
export const ZONES = ["full rink", "one end", "half rink"] as const;
export type Zone = (typeof ZONES)[number];

/** Swedish display labels for zones. */
export const ZONE_LABELS: Record<Zone, string> = {
  "full rink": "Hela rinken",
  "one end": "Ena änden",
  "half rink": "Halva rinken",
};

/** Antnäs (Luleå municipality) approximate coordinates for weather lookup. */
export const ANTNAS_LAT = 65.5;
export const ANTNAS_LON = 22.0;

/**
 * Returns ISO week-numbering year and week for a given date.
 * Mirrors ISO 8601 (week 1 contains the first Thursday).
 */
export function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { year: d.getUTCFullYear(), week };
}

/** Returns the Monday (UTC) of a given ISO year+week. */
export function getDateOfIsoWeek(year: number, week: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const isoWeekStart = simple;
  if (dow <= 4) {
    isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  return isoWeekStart;
}
