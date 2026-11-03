import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { getIsoWeek } from "@shared/rink";
import { AlertTriangle, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Schema() {
  const utils = trpc.useUtils();
  const [now] = useState(() => new Date());
  const current = getIsoWeek(now);
  const [year, setYear] = useState(current.year);
  const dutyQuery = trpc.duty.list.useQuery({ year });
  const teamsQuery = trpc.rinkTeams.list.useQuery();
  const absencesQuery = trpc.rinkTeams.absences.useQuery({ year });

  const setAbsence = trpc.rinkTeams.setAbsence.useMutation({
    onSuccess: (_r, vars) => {
      utils.rinkTeams.absences.invalidate();
      toast.success(vars.absent ? "Förhinder anmält. Admin och laget har meddelats." : "Förhinder borttaget.");
    },
    onError: (e) => toast.error(e.message),
  });

  const teams = useMemo(() => new Map((teamsQuery.data ?? []).map((t) => [t.id, t])), [teamsQuery.data]);
  const absent = useMemo(
    () => new Set((absencesQuery.data ?? []).map((a) => `${a.week}:${a.memberId}`)),
    [absencesQuery.data]
  );

  // Hide weeks that have passed this year (they're history).
  const weeks = (dutyQuery.data ?? []).filter(
    (d) => year !== current.year || d.week >= current.week
  );

  return (
    <SiteLayout>
      <div className="container py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Rinkjour</h1>
            <p className="text-muted-foreground">
              Vilket lag som plogar och spolar rinken vecka för vecka.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-card" onClick={() => setYear((y) => y - 1)}>
              {year - 1}
            </Button>
            <span className="font-extrabold text-lg w-14 text-center">{year}</span>
            <Button variant="outline" size="sm" className="bg-card" onClick={() => setYear((y) => y + 1)}>
              {year + 1}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dutyQuery.isLoading || teamsQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
          ) : weeks.length > 0 ? (
            weeks.map((d) => {
              const isCurrent = year === current.year && d.week === current.week;
              const team = d.teamId ? teams.get(d.teamId) : undefined;
              const legacy = [d.plogjourName, d.spoljourName].filter(Boolean) as string[];
              return (
                <div key={d.id} className={`iso-card p-5 ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary font-extrabold">
                      v{d.week}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold truncate">{team?.name ?? (legacy.length ? "Rinkjour" : "Inget lag")}</div>
                      {isCurrent && (
                        <span className="text-xs font-bold text-primary">Denna vecka</span>
                      )}
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {team
                      ? team.members.map((m) => {
                          const isAbsent = absent.has(`${d.week}:${m.id}`);
                          return (
                            <li key={m.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                              <span className={`font-semibold ${isAbsent ? "line-through text-muted-foreground" : ""}`}>
                                {m.name}
                              </span>
                              {isAbsent && (
                                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">
                                  Förhinder
                                </span>
                              )}
                              {m.phone && (
                                <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 text-primary">
                                  <Phone className="h-3 w-3" /> {m.phone}
                                </a>
                              )}
                              {m.isMe && (
                                <Button
                                  size="sm"
                                  variant={isAbsent ? "outline" : "ghost"}
                                  className="ml-auto h-7 gap-1 bg-card text-xs"
                                  disabled={setAbsence.isPending}
                                  onClick={() => {
                                    const message = isAbsent
                                      ? undefined
                                      : prompt("Vill du skriva något till laget/admin? (valfritt)") ?? undefined;
                                    setAbsence.mutate({ year: d.year, week: d.week, memberId: m.id, absent: !isAbsent, message });
                                  }}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  {isAbsent ? "Ta bort förhinder" : "Jag kan inte"}
                                </Button>
                              )}
                            </li>
                          );
                        })
                      : legacy.map((n) => (
                          <li key={n} className="text-sm font-semibold">
                            {n}
                          </li>
                        ))}
                  </ul>
                  {d.note && <p className="mt-3 text-sm text-muted-foreground">{d.note}</p>}
                </div>
              );
            })
          ) : (
            <div className="iso-card p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">
              Inget schema inlagt för {year} ännu.
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
