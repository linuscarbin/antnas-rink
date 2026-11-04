// Shared rink-domain constants used by both client and server.

/** Booking zones. The rink can be booked whole, or as one of two halves. */
export const ZONES = ["full rink", "half rink"] as const;
export type Zone = (typeof ZONES)[number];

/** Swedish display labels for zones. */
export const ZONE_LABELS: Record<Zone, string> = {
  "full rink": "Hela rinken",
  "half rink": "Halva rinken",
};

/** How many "half rink" bookings fit at the same time. */
export const HALVES = 2;

export type BookingSlot = { id?: number; start: number; end: number; zone: Zone };

/** Strict overlap: back-to-back (edge-touching) slots do NOT overlap. */
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return bStart < aEnd && bEnd > aStart;
}

/**
 * Returns the existing bookings that make a new booking impossible.
 * - Hela rinken krockar med allt som överlappar.
 * - Halva rinken: två halvor får ligga samtidigt; krock först om det redan
 *   finns två halvor bokade vid någon tidpunkt inom den nya bokningen.
 */
export function findBookingConflicts(
  existing: BookingSlot[],
  start: number,
  end: number,
  zone: Zone
): BookingSlot[] {
  const overlapping = existing.filter((b) => overlaps(start, end, b.start, b.end));
  if (zone === "full rink") return overlapping;

  const full = overlapping.filter((b) => b.zone === "full rink");
  if (full.length) return full;

  // Sweep: max number of halves booked at the same time within [start, end).
  const halves = overlapping.filter((b) => b.zone === "half rink");
  const points = halves.flatMap((b) => [
    { t: Math.max(b.start, start), d: +1 },
    { t: Math.min(b.end, end), d: -1 },
  ]);
  points.sort((a, b) => a.t - b.t || a.d - b.d); // ends before starts at same t
  let current = 0;
  let peak = 0;
  for (const p of points) {
    current += p.d;
    peak = Math.max(peak, current);
  }
  return peak >= HALVES ? halves : [];
}

/** Antnäs (Luleå kommun) coordinates for weather lookup. */
export const ANTNAS_LAT = 65.531;
export const ANTNAS_LON = 21.886;

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

/**
 * Rotates teams week by week from one ISO week to another (inclusive),
 * across new year if needed (a winter season runs e.g. v45 → v12).
 */
export function rotateTeams(
  from: { year: number; week: number },
  to: { year: number; week: number },
  teamIds: number[],
  startIndex = 0
): { year: number; week: number; teamId: number }[] {
  if (!teamIds.length) return [];
  const out: { year: number; week: number; teamId: number }[] = [];
  const start = getDateOfIsoWeek(from.year, from.week).getTime();
  const end = getDateOfIsoWeek(to.year, to.week).getTime();
  const WEEK = 7 * 24 * 3600 * 1000;
  for (let t = start, i = 0; t <= end && i < 60; t += WEEK, i++) {
    const { year, week } = getIsoWeek(new Date(t));
    out.push({ year, week, teamId: teamIds[(startIndex + i) % teamIds.length] });
  }
  return out;
}
