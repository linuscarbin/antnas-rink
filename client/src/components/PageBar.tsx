import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Link } from "wouter";

/**
 * Slim sticky bar under the header with the page's name and a way back,
 * so you still know where you are after scrolling down a long page.
 */
export default function PageBar({
  title,
  icon: Icon,
  backHref = "/",
  backLabel = "Tillbaka",
}: {
  title: string;
  icon?: LucideIcon;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="sticky top-[var(--header-h,4rem)] z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container flex h-11 items-center gap-2">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="-ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-extrabold">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
          {title}
        </span>
      </div>
    </div>
  );
}
