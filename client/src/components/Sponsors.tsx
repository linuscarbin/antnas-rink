import { trpc } from "@/lib/trpc";
import { ExternalLink, Heart } from "lucide-react";
import { Link } from "wouter";

type Area = "hockeyrink" | "skidspar";

export type SponsorRow = {
  id: number;
  name: string;
  logoUrl: string | null;
  text: string | null;
  url: string | null;
  tier: "huvud" | "sponsor";
  area: "alla" | Area;
};

export function useSponsors() {
  return trpc.sponsors.list.useQuery(undefined, { staleTime: 10 * 60_000 });
}

/** Link to the sponsor's site (if any), opened in a new tab. */
function SponsorLink({ s, className, children }: { s: SponsorRow; className?: string; children: React.ReactNode }) {
  if (!s.url) return <div className={className}>{children}</div>;
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer sponsored" className={className}>
      {children}
    </a>
  );
}

/** Logo, or the name as a word mark when there is no logo. */
export function SponsorLogo({
  s,
  className = "h-12",
  small = false,
}: {
  s: SponsorRow;
  className?: string;
  /** Tiny box (admin list): smaller word mark that wraps. */
  small?: boolean;
}) {
  return s.logoUrl ? (
    <img src={s.logoUrl} alt={s.name} loading="lazy" className={`${className} w-auto max-w-full object-contain`} />
  ) : (
    <span
      className={`line-clamp-2 break-words text-center font-extrabold leading-tight tracking-tight ${
        small ? "text-xs" : "text-lg"
      }`}
    >
      {s.name}
    </span>
  );
}

/**
 * Big card(s) for main sponsors on a hub's overview, e.g.
 * "Rinken sponsras av …".
 */
export function SponsorSpotlight({ area }: { area: Area }) {
  const { data } = useSponsors();
  const main = (data ?? []).filter((s) => s.tier === "huvud" && (s.area === "alla" || s.area === area));
  if (!main.length) return null;
  return (
    <section className="container pt-8">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Heart className="h-3.5 w-3.5 text-primary" />
        {area === "hockeyrink" ? "Rinken sponsras av" : "Spåret sponsras av"}
      </div>
      <div className={`grid gap-3 ${main.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {main.map((s) => (
          <SponsorLink
            key={s.id}
            s={s}
            className="iso-card flex items-center gap-4 p-4 sm:p-5 transition hover:border-primary/40"
          >
            <span className="grid h-20 w-40 shrink-0 place-items-center rounded-xl bg-white p-2 ring-1 ring-border sm:w-48">
              <SponsorLogo s={s} className="max-h-16" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-extrabold">
                {s.name}
                {s.url && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </span>
              {s.text && <span className="mt-0.5 block text-sm text-muted-foreground">{s.text}</span>}
            </span>
          </SponsorLink>
        ))}
      </div>
    </section>
  );
}

/**
 * Slim band at the bottom of the sticky header (always visible) where the sponsors' logos roll by. Tapping
 * one opens its site (or /sponsorer when it has none). Pauses on hover/
 * focus; with "reduce motion" it stands still and can be swiped instead.
 */
export function SponsorTicker() {
  const { data } = useSponsors();
  if (!data?.length) return null;
  // Repeat the list so one half is wider than any screen, then show two
  // identical halves: sliding by -50% loops seamlessly.
  const half = Array.from({ length: Math.max(1, Math.ceil(8 / data.length)) }, () => data).flat();
  const seconds = Math.max(20, half.length * 4);
  const item = (s: SponsorRow, key: string, hidden: boolean) => {
    const inner = (
      <span className="flex h-7 items-center px-4">
        {s.logoUrl ? (
          <img src={s.logoUrl} alt={s.name} className="h-5 w-auto max-w-24 object-contain" loading="lazy" />
        ) : (
          <span className="whitespace-nowrap text-xs font-bold tracking-tight">{s.name}</span>
        )}
      </span>
    );
    const common = { className: "shrink-0", ...(hidden ? { "aria-hidden": true, tabIndex: -1 } : {}) };
    return s.url ? (
      <a key={key} {...common} href={s.url} target="_blank" rel="noopener noreferrer sponsored">
        {inner}
      </a>
    ) : (
      <Link key={key} {...common} href="/sponsorer">
        {inner}
      </Link>
    );
  };
  return (
    <div
      className="sponsor-ticker relative overflow-hidden border-t border-border/60 bg-white"
      aria-label="Våra sponsorer"
      role="region"
    >
      <div
        className="sponsor-ticker-track flex w-max items-center"
        style={{ ["--ticker-duration" as string]: `${seconds}s` }}
      >
        {half.map((s, i) => item(s, `a${i}`, i >= data.length))}
        {half.map((s, i) => item(s, `b${i}`, true))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white" />
    </div>
  );
}

/** "Tack till våra sponsorer" logo row, shown above the footer on every page. */
export function SponsorStrip() {
  const { data } = useSponsors();
  if (!data?.length) return null;
  return (
    <section className="border-t border-border/70 bg-card/60">
      <div className="container py-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Heart className="h-3.5 w-3.5 text-primary" /> Tack till våra sponsorer
          </span>
          <Link href="/sponsorer" className="text-xs font-semibold text-primary">
            Alla sponsorer →
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {data.map((s) => (
            <SponsorLink
              key={s.id}
              s={s}
              className="grid h-16 min-w-24 place-items-center rounded-xl bg-white px-3 py-2 ring-1 ring-border transition hover:ring-primary/50"
            >
              <SponsorLogo s={s} className="max-h-12" />
            </SponsorLink>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Full list for /sponsorer. */
export function SponsorList({ sponsors }: { sponsors: SponsorRow[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sponsors.map((s) => (
        <SponsorLink
          key={s.id}
          s={s}
          className={`iso-card flex flex-col gap-3 p-5 transition hover:border-primary/40 ${
            s.tier === "huvud" ? "sm:col-span-2 border-primary/40" : ""
          }`}
        >
          <span className="grid h-28 place-items-center rounded-xl bg-white p-3 ring-1 ring-border">
            <SponsorLogo s={s} className="max-h-24" />
          </span>
          <span>
            <span className="flex flex-wrap items-center gap-2 font-extrabold">
              {s.name}
              {s.tier === "huvud" && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Huvudsponsor
                </span>
              )}
            </span>
            {s.text && <span className="mt-1 block text-sm text-muted-foreground">{s.text}</span>}
            {s.url && (
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {s.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            )}
          </span>
        </SponsorLink>
      ))}
    </div>
  );
}
