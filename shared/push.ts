// Push-notification topics and pure helpers shared by client and server.

export const PUBLIC_TOPICS = ["rink_spolad", "track_draget", "group", "rink_closed"] as const;
export const DUTY_TOPICS = ["duty_jobs", "duty_reminder", "snow_alert", "duty_conflict"] as const;
export const ALL_TOPICS = [...PUBLIC_TOPICS, ...DUTY_TOPICS] as const;
export type PushTopic = (typeof ALL_TOPICS)[number];

export const TOPIC_INFO: Record<PushTopic, { label: string; hint: string }> = {
  rink_spolad: { label: "Rinken är nyspolad", hint: "När jouren har spolat isen" },
  track_draget: { label: "Spåret är nydraget", hint: "När skidspåret har dragits" },
  group: { label: "Ett gäng är på väg", hint: "När minst 3 checkat in samtidigt" },
  rink_closed: { label: "Rinken stängd", hint: "T.ex. vid töväder" },
  duty_jobs: { label: "Jobb i laget", hint: "När någon föreslår ett jobb eller svarar på ditt" },
  duty_reminder: { label: "Din jourvecka", hint: "Påminnelse när din vecka börjar" },
  snow_alert: { label: "Snövarning", hint: "Mycket snö senaste dygnet – plogning behövs" },
  duty_conflict: { label: "Förhinder i jouren", hint: "När någon behöver ersättare" },
};

export function isDutyTopic(t: string): boolean {
  return (DUTY_TOPICS as readonly string[]).includes(t);
}

/** Hour (0–23) in Swedish time, regardless of server time zone. */
export function stockholmHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("sv-SE", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/Stockholm",
    }).format(date)
  );
}

/** No notifications between 22:00 and 07:00 Swedish time. */
export function isQuietTime(date: Date): boolean {
  const h = stockholmHour(date);
  return h >= 22 || h < 7;
}

/** Topics are stored as ",a,b," so a LIKE '%,a,%' match is exact. */
export function encodeTopics(topics: readonly string[]): string {
  const valid = Array.from(new Set(topics.filter((t) => (ALL_TOPICS as readonly string[]).includes(t))));
  return valid.length ? `,${valid.join(",")},` : "";
}

export function decodeTopics(stored: string | null | undefined): PushTopic[] {
  return (stored ?? "")
    .split(",")
    .filter((t): t is PushTopic => (ALL_TOPICS as readonly string[]).includes(t));
}

/** People expected at the same time: check-ins whose arrival is within ±60 min. */
export function groupSize(
  checkins: { arriveAt: number; people: number }[],
  at: number,
  windowMs = 60 * 60 * 1000
): number {
  return checkins
    .filter((c) => Math.abs(c.arriveAt - at) <= windowMs)
    .reduce((sum, c) => sum + c.people, 0);
}

/** Where a duty notification for an area should open (the hub's "Jour" tab). */
export function jourUrl(area: "hockeyrink" | "skidspar"): string {
  return area === "hockeyrink" ? "/?flik=jour" : "/skidspar?flik=jour";
}
