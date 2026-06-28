export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

export function formatDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Relative "for X sedan" string in Swedish. */
export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nyss";
  if (mins < 60) return `${mins} min sedan`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  return `${days} dygn sedan`;
}
