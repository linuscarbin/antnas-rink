// Shared helpers for planned duty jobs ("Jag kan ploga 18–20").

export const JOB_KINDS = ["plog", "spol", "plog_spol", "spar", "annat"] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_KIND_LABEL: Record<JobKind, string> = {
  plog: "Ploga",
  spol: "Spola",
  plog_spol: "Ploga + spola",
  spar: "Dra spår",
  annat: "Annat",
};

/** Which job kinds make sense for an area. */
export const AREA_JOB_KINDS: Record<"hockeyrink" | "skidspar", JobKind[]> = {
  hockeyrink: ["plog", "spol", "plog_spol", "annat"],
  skidspar: ["spar", "annat"],
};

const TZ = "Europe/Stockholm";

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/**
 * Human Swedish time window, e.g. "ikväll 18:00–20:00", "imorgon 07:00–09:00",
 * "ons 5 nov 18:00–20:00". Always in Swedish time.
 */
export function formatJobWindow(start: Date, end: Date, now = new Date()): string {
  const time = (d: Date) =>
    new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 24 * 3600 * 1000));
  const day = dayKey(start);
  const hour = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(start));
  let when: string;
  if (day === today) when = hour >= 17 ? "ikväll" : "idag";
  else if (day === tomorrow) when = "imorgon";
  else
    when = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(start);
  return `${when} ${time(start)}–${time(end)}`;
}

/** Splits a free-text helper list ("Lisa, Olle och Sven") into names. */
export function parseHelpers(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/,|\boch\b|&|\+/i)
    .map((n) => n.trim())
    .filter(Boolean);
}

/**
 * "Kalle", "Kalle och Lisa", "Kalle, Lisa och Olle" – who did the work, for the
 * status card. Duplicates removed; kept within `max` characters.
 */
export function workedBy(main: string, helpers: string[] = [], max = 120): string {
  const names = Array.from(new Set([main, ...helpers].map((n) => n.trim()).filter(Boolean)));
  const join = (list: string[]) =>
    list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} och ${list[list.length - 1]}`;
  let text = join(names);
  for (let shown = names.length - 1; text.length > max && shown >= 1; shown--) {
    text = `${names.slice(0, shown).join(", ")} m.fl.`;
  }
  return text.slice(0, max);
}

/** Date + hour/minute parts of a moment in Swedish time. */
export function stockholmParts(d: Date): { day: string; hour: number; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

/**
 * The moment "YYYY-MM-DD HH:MM" in Swedish time, independent of the device's
 * own time zone (handles summer/winter time).
 */
export function fromStockholm(day: string, time: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  // Swedish offset at that moment = what Stockholm's clock shows minus UTC.
  const p = stockholmParts(new Date(guess));
  const [py, pm, pd] = p.day.split("-").map(Number);
  const offset = Date.UTC(py, pm - 1, pd, p.hour, p.minute) - guess;
  return new Date(guess - offset);
}
