import type { Verdict, VerdictLevel } from "@shared/verdict";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, CircleHelp, CircleX, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";

const STYLE: Record<VerdictLevel, { bg: string; fg: string; ring: string }> = {
  green: {
    bg: "oklch(0.72 0.15 155 / 0.14)",
    fg: "oklch(0.42 0.12 155)",
    ring: "oklch(0.72 0.15 155)",
  },
  yellow: {
    bg: "oklch(0.82 0.15 85 / 0.2)",
    fg: "oklch(0.45 0.1 75)",
    ring: "oklch(0.78 0.15 80)",
  },
  red: {
    bg: "oklch(0.65 0.2 25 / 0.14)",
    fg: "oklch(0.48 0.18 25)",
    ring: "oklch(0.62 0.2 25)",
  },
  unknown: {
    bg: "oklch(0.6 0.02 250 / 0.1)",
    fg: "oklch(0.45 0.02 250)",
    ring: "oklch(0.7 0.02 250)",
  },
};

const ICON: Record<VerdictLevel, typeof CheckCircle2> = {
  green: CheckCircle2,
  yellow: AlertTriangle,
  red: CircleX,
  unknown: CircleHelp,
};

/** Big traffic-light answer: "Is it skateable / skiable right now?" */
export default function VerdictCard({
  label,
  verdict,
  loading,
  meta,
  href,
  photo,
}: {
  label: string;
  verdict: Verdict | null;
  loading?: boolean;
  /** Small extra line, e.g. "Plogad 3 tim sedan". */
  meta?: ReactNode;
  /** Optional link to the detail page. */
  href?: string;
  /** Latest photo from the duty crew. */
  photo?: { url: string; caption: string } | null;
}) {
  if (loading || !verdict) {
    return <Skeleton className="h-36 rounded-2xl" />;
  }
  const s = STYLE[verdict.level];
  const Icon = ICON[verdict.level];
  const body = (
    <div
      className="rounded-2xl border-2 h-full overflow-hidden transition-shadow hover:shadow-md"
      style={{ background: s.bg, borderColor: s.ring }}
    >
      {photo &&
        (() => {
          const img = (
            <>
              <img
                src={photo.url}
                alt={`Senaste foto – ${label}`}
                className="h-40 sm:h-44 w-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                {photo.caption}
              </span>
            </>
          );
          // Inside a link card the image can't be its own link (no nested <a>).
          return href ? (
            <div className="relative">{img}</div>
          ) : (
            <a href={photo.url} target="_blank" rel="noreferrer" className="relative block">
              {img}
            </a>
          );
        })()}
      <div className="p-5 sm:p-6">
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: s.fg }}>
        {label}
      </div>
      <div className="mt-1 flex items-center gap-3">
        <Icon className="h-9 w-9 shrink-0" style={{ color: s.ring }} />
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: s.fg }}>
          {verdict.title}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground/80">{verdict.detail}</p>
      {meta && <div className="mt-1 text-xs text-muted-foreground">{meta}</div>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
