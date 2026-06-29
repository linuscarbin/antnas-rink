import IsoDecor from "@/components/IsoDecor";
import SiteLayout from "@/components/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDay, formatTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import {
  CalendarDays,
  Info,
  MapPin,
  Phone,
  Ticket,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

function currentSeasonYear(now = new Date()): number {
  return now.getFullYear();
}

export default function Bilbingo() {
  const [season] = useState(() => currentSeasonYear());
  const occasionsQuery = trpc.bingo.listOccasions.useQuery({ season });
  const assignmentsQuery = trpc.bingo.listAssignments.useQuery();
  const infoQuery = trpc.settings.getBingoInfo.useQuery();

  const filledByOccasion = useMemo(() => {
    const m = new Map<number, number>();
    for (const a of assignmentsQuery.data ?? []) {
      m.set(a.occasionId, (m.get(a.occasionId) ?? 0) + 1);
    }
    return m;
  }, [assignmentsQuery.data]);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <IsoDecor />
        <div className="container relative py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Ticket className="h-3.5 w-3.5" /> ABK Bilbingo
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
              Bilbingo i <span className="text-primary">Antnäs</span>
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Varje sommar arrangerar Antnäs BK bilbingo på måndagskvällar. En
              uppskattad tradition som drivs helt av föreningens familjer
              tillsammans.
            </p>
          </div>
        </div>
      </section>

      <div className="container py-8 grid gap-6 lg:grid-cols-3">
        {/* Occasions */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-extrabold tracking-tight">
              Tillfällen {season}
            </h2>
          </div>

          {occasionsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : occasionsQuery.data && occasionsQuery.data.length > 0 ? (
            <div className="space-y-3">
              {occasionsQuery.data.map((o) => {
                const filled = filledByOccasion.get(o.id) ?? 0;
                const full = filled >= o.targetCount;
                return (
                  <div key={o.id} className="iso-card p-5 flex items-center gap-4">
                    <div className="grid place-items-center rounded-xl bg-primary/10 text-primary h-14 w-14 shrink-0">
                      <Ticket className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold capitalize">
                        {formatDay(o.occasionDate)}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>kl {formatTime(o.occasionDate)}</span>
                        {o.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {o.location}
                          </span>
                        )}
                      </div>
                      {o.leadName && (
                        <div className="text-sm mt-1 inline-flex items-center gap-1.5">
                          <span className="text-muted-foreground">Kvällsansvarig:</span>
                          <span className="font-semibold">{o.leadName}</span>
                          {o.leadPhone && (
                            <a
                              href={`tel:${o.leadPhone}`}
                              className="inline-flex items-center gap-1 text-primary"
                            >
                              <Phone className="h-3.5 w-3.5" /> {o.leadPhone}
                            </a>
                          )}
                        </div>
                      )}
                      {o.note && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {o.note}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          full
                            ? "bg-primary/15 text-primary"
                            : "bg-amber-500/10 text-amber-700"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5" />
                        {filled}/{o.targetCount} bemannade
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="iso-card p-8 text-center text-muted-foreground">
              Inga tillfällen inlagda för {season} ännu. Håll utkik!
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="lg:col-span-1">
          <div className="iso-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-primary" />
              <h3 className="font-extrabold text-lg">Så funkar det</h3>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">När:</strong> Måndagskvällar
                under sommaren, oftast kl 17–22.
              </li>
              <li>
                <strong className="text-foreground">Var:</strong> Antnäs IP.
              </li>
              <li>
                <strong className="text-foreground">Vem jobbar:</strong> Föräldrar
                till aktiva barn hjälps åt att bemanna kvällarna. Antalet pass
                fördelas rättvist efter hur många aktiva barn varje familj har.
              </li>
              <li>
                <strong className="text-foreground">Lagledare:</strong> Varje lag
                fyller i sina familjer via en egen länk, så fördelar föreningen
                passen automatiskt och rättvist.
              </li>
              <li>
                Intäkterna går oavkortat till barn- och ungdomsverksamheten i
                Antnäs BK.
              </li>
            </ul>
          </div>

          {/* Editable detailed info */}
          {infoQuery.data?.text ? (
            <div className="iso-card p-6 mt-6">
              <h3 className="font-extrabold text-lg mb-3">Allt du behöver veta</h3>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <Streamdown>{infoQuery.data.text}</Streamdown>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </SiteLayout>
  );
}
