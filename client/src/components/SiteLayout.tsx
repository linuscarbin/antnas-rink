import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  FolderOpen,
  MessageSquare,
  Snowflake,
  Sun,
  Ticket,
  Trees,
  Users,
} from "lucide-react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";

type NavItem = { href: string; label: string; icon: LucideIcon };

const WINTER_NAV: NavItem[] = [
  { href: "/", label: "Hockeyrink", icon: Snowflake },
  { href: "/skidspar", label: "Skidspår", icon: Trees },
  { href: "/schema", label: "Schema", icon: CalendarDays },
  { href: "/boka", label: "Boka", icon: CalendarDays },
  { href: "/anslagstavla", label: "Anslagstavla", icon: MessageSquare },
  { href: "/dokument", label: "Dokument", icon: FolderOpen },
  { href: "/kontakt", label: "Kontakt", icon: Users },
];

const SUMMER_NAV: NavItem[] = [
  { href: "/bilbingo", label: "Bilbingo", icon: Ticket },
  { href: "/anslagstavla", label: "Anslagstavla", icon: MessageSquare },
  { href: "/dokument", label: "Dokument", icon: FolderOpen },
  { href: "/kontakt", label: "Kontakt", icon: Users },
  { href: "/", label: "Hockeyrink", icon: Snowflake },
  { href: "/skidspar", label: "Skidspår", icon: Trees },
];

export default function SiteLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const seasonQuery = trpc.settings.getSeason.useQuery();
  const season = seasonQuery.data?.season ?? "vinter";
  const isSummer = season === "sommar";
  const nav = isSummer ? SUMMER_NAV : WINTER_NAV;
  const brandWord = isSummer ? "Sommar" : "Vinter";
  const BrandIcon = isSummer ? Sun : Snowflake;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BrandIcon className="h-5 w-5" />
            </span>
            <span className="font-extrabold text-lg leading-none tracking-tight">
              Antnäs<span className="text-primary"> {brandWord}</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="bg-card gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link href="/profil">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden sm:inline">{user?.name || "Profil"}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="gap-1.5"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logga ut</span>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                Logga in
              </Button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden border-t border-border/60 bg-background/90">
          <div className="container flex items-center gap-1 overflow-x-auto py-2">
            {nav.map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/70 bg-background/70">
        <div className="container py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-foreground">Antnäs BK</span>
          <span>Hockeyrink, skidspår och bilbingo — skött av oss tillsammans.</span>
        </div>
      </footer>
    </div>
  );
}
