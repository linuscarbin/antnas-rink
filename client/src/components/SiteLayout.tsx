import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FEATURES } from "@shared/const";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  type LucideIcon,
  FolderOpen,
  Bell,
  Heart,
  MessageSquare,
  Snowflake,
  Sun,
  Ticket,
  Trees,
  Users,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { SponsorStrip, SponsorTicker } from "@/components/Sponsors";

type NavItem = { href: string; label: string; icon: LucideIcon };

const WINTER_NAV: NavItem[] = [
  { href: "/", label: "Rinken", icon: Snowflake },
  { href: "/skidspar", label: "Skidspåret", icon: Trees },
  { href: "/anslagstavla", label: "Anslagstavla", icon: MessageSquare },
  { href: "/dokument", label: "Dokument", icon: FolderOpen },
  { href: "/kontakt", label: "Kontakt", icon: Users },
  { href: "/sponsorer", label: "Sponsorer", icon: Heart },
];

/**
 * Bottom bar on mobile. Rinken and Skidspåret are hubs: booking, duty,
 * rules and costs are tabs inside them, shown depending on your role.
 */
const WINTER_TABS: NavItem[] = [
  { href: "/", label: "Rinken", icon: Snowflake },
  { href: "/skidspar", label: "Skidspår", icon: Trees },
  { href: "/anslagstavla", label: "Tavlan", icon: MessageSquare },
];

const SUMMER_TABS: NavItem[] = [
  { href: "/bilbingo", label: "Bilbingo", icon: Ticket },
  { href: "/anslagstavla", label: "Tavlan", icon: MessageSquare },
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
  { href: "/sponsorer", label: "Sponsorer", icon: Heart },
];

export default function SiteLayout({
  children,
  hideSponsorStrip = false,
}: {
  children: ReactNode;
  hideSponsorStrip?: boolean;
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const seasonQuery = trpc.settings.getSeason.useQuery();
  const season = seasonQuery.data?.season ?? "vinter";
  const isSummer = season === "sommar";
  const nav = isSummer ? SUMMER_NAV : WINTER_NAV;
  const tabs = isSummer ? SUMMER_TABS : WINTER_TABS;
  const moreItems: NavItem[] = [
    ...nav.filter((n) => !tabs.some((t) => t.href === n.href)),
    ...(isSummer || !FEATURES.bilbingo
      ? []
      : [{ href: "/bilbingo", label: "Bilbingo", icon: Ticket }]),
    { href: "/notiser", label: "Notiser & app", icon: Bell },
    ...(user?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: LayoutDashboard }]
      : []),
  ];
  const brandWord = isSummer ? "Sommar" : "Vinter";
  const BrandIcon = isSummer ? Sun : Snowflake;

  return (
    <div className="min-h-screen flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
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

          <nav className="hidden lg:flex items-center gap-0.5">
            {nav.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${
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
            <Link href="/notiser" aria-label="Notiser">
              <Button variant="ghost" size="icon" title="Notiser">
                <Bell className="h-4 w-4" />
              </Button>
            </Link>
            {user?.role === "admin" && (
              <Link href="/admin" className="hidden md:block">
                <Button variant="outline" size="sm" className="bg-card gap-1.5" title="Admin" aria-label="Admin">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden 2xl:inline">Admin</span>
                </Button>
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link href="/profil">
                  <Button variant="ghost" size="sm" className="gap-1.5" title="Profil" aria-label="Profil">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                      {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden 2xl:inline">{user?.name || "Profil"}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="gap-1.5"
                  title="Logga ut"
                  aria-label="Logga ut"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden 2xl:inline">Logga ut</span>
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

        {/* Tablet nav (md–lg): compact row */}
        <nav className="hidden md:block lg:hidden border-t border-border/60 bg-background/90">
          <div className="container flex items-center gap-1 overflow-x-auto py-2">
            {nav.map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
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

      {!hideSponsorStrip && <SponsorTicker />}

      <main className="flex-1 pb-6 md:pb-0">{children}</main>

      {!hideSponsorStrip && <SponsorStrip />}
      <footer className="border-t border-border/70 bg-background/70">
        <div className="container py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span className="font-semibold text-foreground">Antnäs BK</span>
          <span>Hockeyrink och skidspår — skött av oss tillsammans.</span>
        </div>
      </footer>

      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map((item) => {
            const active = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
              moreItems.some((m) => m.href === location) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Menu className="h-5 w-5" />
            Mer
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>Mer</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 px-4">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
