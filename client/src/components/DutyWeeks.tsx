import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDutyWeeks, type DutyArea, type DutyWeek } from "@/hooks/useDutyWeeks";
import { trpc } from "@/lib/trpc";
import { getIsoWeek } from "@shared/rink";
import { AlertTriangle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

/** Year selector + one card per upcoming week with the team on duty. */
export default function DutyWeeks({ area }: { area: DutyArea }) {
  const [now] = useState(() => new Date());
  const current = getIsoWeek(now);
  const [year, setYear] = useState(current.year);
  const { weeks, isAbsent, loading } = useDutyWeeks(area, year);
  const utils = trpc.useUtils();
  const setAbsence = trpc.dutyTeams.setAbsence.useMutation({
    onSuccess: (_r, vars) => {
      utils.dutyTeams.absences.invalidate();
      toast.success(vars.absent ? "Förhinder anmält. Admin och laget har meddelats." : "Förhinder borttaget.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Weeks that have passed this year are history – hide them.
  const visible = weeks.filter((d) => year !== current.year || d.week >= current.week);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="bg-card" onClick={() => setYear((y) => y - 1)}>
          {year - 1}
        </Button>
        <span className="font-extrabold text-lg w-14 text-center">{year}</span>
        <Button variant="outline" size="sm" className="bg-card" onClick={() => setYear((y) => y + 1)}>
          {year + 1}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
        ) : visible.length > 0 ? (
          visible.map((d) => (
            <WeekCard
              key={d.id}
              d={d}
              isCurrent={year === current.year && d.week === current.week}
              isAbsent={isAbsent}
              pending={setAbsence.isPending}
              onToggle={(memberId, absent) => {
                const message = absent
                  ? prompt("Vill du skriva något till laget/admin? (valfritt)") ?? undefined
                  : undefined;
                setAbsence.mutate({ year: d.year, week: d.week, memberId, absent, message });
              }}
            />
          ))
        ) : (
          <div className="iso-card p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">
            Inget schema inlagt för {year} ännu.
          </div>
        )}
      </div>
    </>
  );
}

function WeekCard({
  d,
  isCurrent,
  isAbsent,
  pending,
  onToggle,
}: {
  d: DutyWeek;
  isCurrent: boolean;
  isAbsent: (week: number, memberId: number) => boolean;
  pending: boolean;
  onToggle: (memberId: number, absent: boolean) => void;
}) {
  return (
    <div className={`iso-card p-5 ${isCurrent ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary font-extrabold">
          v{d.week}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold truncate">{d.team?.name ?? (d.legacy.length ? "Jour" : "Inget lag")}</div>
          {isCurrent && <span className="text-xs font-bold text-primary">Denna vecka</span>}
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {d.team
          ? d.team.members.map((m) => {
              const absent = isAbsent(d.week, m.id);
              return (
                <MemberLine key={m.id} name={m.name} phone={m.phone} absent={absent}>
                  {m.isMe && (
                    <Button
                      size="sm"
                      variant={absent ? "outline" : "ghost"}
                      className="ml-auto h-7 gap-1 bg-card text-xs"
                      disabled={pending}
                      onClick={() => onToggle(m.id, !absent)}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {absent ? "Ta bort förhinder" : "Jag kan inte"}
                    </Button>
                  )}
                </MemberLine>
              );
            })
          : d.legacy.map((l) => <MemberLine key={l.name} name={l.name} phone={l.phone} absent={l.conflict} />)}
      </ul>
      {d.note && <p className="mt-3 text-sm text-muted-foreground">{d.note}</p>}
    </div>
  );
}

export function MemberLine({
  name,
  phone,
  absent,
  children,
}: {
  name: string;
  phone: string | null;
  absent: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className={`font-semibold ${absent ? "line-through text-muted-foreground" : ""}`}>{name}</span>
      {absent && (
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">Förhinder</span>
      )}
      {phone && (
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-primary">
          <Phone className="h-3 w-3" /> {phone}
        </a>
      )}
      {children}
    </li>
  );
}

/** Compact "this week" card used on the rink and ski-track pages. */
export function ThisWeekDuty({ area }: { area: DutyArea }) {
  const [now] = useState(() => new Date());
  const { year, week } = getIsoWeek(now);
  const { weeks, isAbsent, loading } = useDutyWeeks(area, year);
  const d = weeks.find((w) => w.week === week);
  const label = area === "hockeyrink" ? "Rinkjour" : "Spårjour";
  return (
    <div className="iso-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Vecka {week} · {label}
        </div>
        {area === "hockeyrink" && (
          <Link href="/schema" className="text-sm font-semibold text-primary">
            Hela schemat
          </Link>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-20" />
      ) : d && (d.team || d.legacy.length) ? (
        <div className="mt-3">
          {d.team && <div className="font-extrabold">{d.team.name}</div>}
          <ul className="mt-2 space-y-1.5">
            {d.team
              ? d.team.members.map((m) => (
                  <MemberLine key={m.id} name={m.name} phone={m.phone} absent={isAbsent(week, m.id)} />
                ))
              : d.legacy.map((l) => <MemberLine key={l.name} name={l.name} phone={l.phone} absent={l.conflict} />)}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Ingen {label.toLowerCase()} inlagd för denna vecka ännu.</p>
      )}
    </div>
  );
}
