// Helpers for user identity: display names and Swedish phone numbers.

/** Name to show for a user: name, else e-mail, else phone. */
export function displayName(u: { name?: string | null; email?: string | null; phone?: string | null }): string {
  return u.name?.trim() || u.email || u.phone || "Okänd";
}

/**
 * Normalizes a Swedish phone number to +46… so "070-123 45 67",
 * "0701234567", "46701234567" and "+46 70 123 45 67" are the same.
 * Returns null if it doesn't look like a phone number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (/^0\d{6,12}$/.test(s)) s = `+46${s.slice(1)}`;
  else if (/^46\d{7,12}$/.test(s)) s = `+${s}`;
  return /^\+\d{8,15}$/.test(s) ? s : null;
}

/** Number for a wa.me link (digits only, country code first). */
export function whatsappNumber(raw: string | null | undefined): string | null {
  const p = normalizePhone(raw);
  return p ? p.slice(1) : null;
}

/** True if the login identifier looks like an e-mail address. */
export function isEmail(identifier: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
}

/**
 * Parses pasted lines like "Lisa Andersson 070-123 45 67" or
 * "Lisa Andersson, 0701234567" (e.g. copied from a WhatsApp group).
 */
export function parseMemberLines(text: string): { name: string; phone: string | null; raw: string }[] {
  return text
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/(\+?[\d][\d\s\-()]{6,})\s*$/);
      const phone = m ? normalizePhone(m[1]) : null;
      const name = (m && phone ? raw.slice(0, m.index) : raw).replace(/[,;:\t]+\s*$/, "").trim();
      return { name, phone, raw };
    });
}

/** Swedish display format: +46734445566 → "073-444 55 66". */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const p = normalizePhone(raw);
  if (!p || !p.startsWith("+46")) return raw;
  const local = `0${p.slice(3)}`;
  if (/^07\d{8}$/.test(local)) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
  }
  return local;
}
