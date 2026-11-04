import type { LucideIcon } from "lucide-react";
import { useLocation, useSearch } from "wouter";

export type HubTab<T extends string> = { id: T; label: string; icon: LucideIcon };

/** Current tab from ?flik=… (shareable, back button works). */
export function useHubTab<T extends string>(tabs: HubTab<T>[], fallback: T): [T, (t: T) => void] {
  const search = useSearch();
  const [location, navigate] = useLocation();
  const wanted = new URLSearchParams(search).get("flik") as T | null;
  const current = wanted && tabs.some((t) => t.id === wanted) ? wanted : fallback;
  const set = (t: T) => {
    navigate(t === fallback ? location : `${location}?flik=${t}`);
    window.scrollTo({ top: 0 });
  };
  return [current, set];
}

/** Sticky, swipeable tab row under the site header. */
export default function HubTabs<T extends string>({
  title,
  tabs,
  value,
  onChange,
}: {
  title: string;
  tabs: HubTab<T>[];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="sticky top-[var(--header-h,4rem)] z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container flex items-center gap-3">
        <span className="hidden shrink-0 py-2 text-sm font-extrabold sm:block">{title}</span>
        <nav className="-mx-4 flex flex-1 gap-1 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0" aria-label={title}>
          {tabs.map((t) => {
            const active = t.id === value;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
