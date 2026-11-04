import { useAuth } from "@/_core/hooks/useAuth";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import {
  CalendarDays,
  CalendarRange,
  Hammer,
  Heart,
  BookOpen,
  Settings,
  FolderOpen,
  Ticket,
  Trees,
  Users,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import AdminBingo from "./admin/AdminBingo";
import { FEATURES } from "@shared/const";
import AdminBookings from "./admin/AdminBookings";
import AdminSponsors from "./admin/AdminSponsors";
import EventsBoard from "@/components/EventsBoard";
import AdminDocs from "./admin/AdminDocs";
import AdminContacts from "./admin/AdminContacts";
import AdminDuty from "./admin/AdminDuty";
import AdminGuides from "./admin/AdminGuides";
import AdminSettings from "./admin/AdminSettings";
import AdminUsers from "./admin/AdminUsers";

const TABS = [
  { id: "duty", label: "Rinkjour", icon: CalendarDays },
  { id: "skiduty", label: "Spårjour", icon: Trees },
  { id: "events", label: "Arbetsdagar", icon: Hammer },
  { id: "guides", label: "Guider", icon: BookOpen },
  ...(FEATURES.bilbingo ? [{ id: "bingo", label: "Bilbingo", icon: Ticket } as const] : []),
  { id: "docs", label: "Dokument", icon: FolderOpen },
  { id: "contacts", label: "Kontakter", icon: Users },
  { id: "sponsors", label: "Sponsorer", icon: Heart },
  { id: "bookings", label: "Bokningar", icon: CalendarRange },
  { id: "users", label: "Användare", icon: UsersRound },
  { id: "settings", label: "Inställningar", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<TabId>("duty");

  if (loading) {
    return (
      <SiteLayout>
        <div className="container py-8 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) {
    return (
      <SiteLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-extrabold">Logga in för admin</h1>
          <Button
            className="mt-4"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Logga in
          </Button>
        </div>
      </SiteLayout>
    );
  }

  if (user.role !== "admin") {
    return (
      <SiteLayout>
        <div className="container py-16 text-center text-muted-foreground">
          <h1 className="text-2xl font-extrabold text-foreground">
            Endast för admin
          </h1>
          <p className="mt-2">
            Du har inte behörighet till adminpanelen. Kontakta en ansvarig om du
            behöver åtkomst.
          </p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Adminpanel</h1>
        <p className="text-muted-foreground">
          Hantera jourscheman, arbetsdagar, kontakter, bokningar, användare och påminnelser.
        </p>

        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto border-b border-border/60 px-4 pb-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {tab === "duty" && <AdminDuty key="hockeyrink" area="hockeyrink" />}
          {tab === "skiduty" && <AdminDuty key="skidspar" area="skidspar" />}
          {tab === "events" && <EventsBoard />}
          {tab === "sponsors" && <AdminSponsors />}
          {tab === "guides" && <AdminGuides />}
          {tab === "bingo" && <AdminBingo />}
          {tab === "docs" && <AdminDocs />}
          {tab === "contacts" && <AdminContacts />}
          {tab === "bookings" && <AdminBookings />}
          {tab === "users" && <AdminUsers />}
          {tab === "settings" && <AdminSettings />}
        </div>
      </div>
    </SiteLayout>
  );
}
