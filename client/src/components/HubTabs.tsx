import { ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const navRef = useRef<HTMLElement>(null);
  const [moreRight, setMoreRight] = useState(false);
  const updateFade = () => {
    const el = navRef.current;
    if (el) setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  // Keep the active tab in view (e.g. "Kostnader" far right) and update the hint.
  useEffect(() => {
    const el = navRef.current;
    const active = el?.querySelector<HTMLElement>("[data-active]");
    if (el && active) {
      // Center the active tab (scrolls to the end for the last one).
      el.scrollLeft = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    }
    requestAnimationFrame(updateFade);
    window.addEventListener("resize", updateFade);
    return () => window.removeEventListener("resize", updateFade);
  }, [value, tabs.length]);

  return (
    <div className="sticky top-[var(--header-h,4rem)] z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container flex items-center gap-3">
        <span className="hidden shrink-0 py-2 text-sm font-extrabold sm:block">{title}</span>
        <div className="relative min-w-0 flex-1">
        <nav
          ref={navRef}
          onScroll={updateFade}
          className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0"
          aria-label={title}
        >
          {tabs.map((t) => {
            const active = t.id === value;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                data-active={active || undefined}
                onClick={() => onChange(t.id)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold sm:px-3.5 transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
        {/* Fade + arrow hint when more tabs are hidden to the right. */}
        {moreRight && (
          <div className="pointer-events-none absolute inset-y-0 -right-4 flex w-12 items-center justify-end bg-gradient-to-l from-background via-background/80 to-transparent pr-1 sm:right-0">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
