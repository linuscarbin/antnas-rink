import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDutyWeeks, type AbsenceInfo, type DutyArea, type DutyWeek } from "@/hooks/useDutyWeeks";
import { trpc } from "@/lib/trpc";
import { getIsoWeek } from "@shared/rink";
import { formatPhone } from "@shared/user";
import { AlertTriangle, Check, HandHelping, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

/** Year selector + one card per upcoming week with the team on duty. */
export default function DutyWeeks({ area }: { area: DutyArea }) {
  const [now] = useState(() => new Date());
  const current = getIsoWeek(now);
  const [year, setYear] = useState(current.year);
  const { weeks, isAbsent, absence, loading } = useDutyWeeks(area, year);
  const { isRinkFunctionary, isTrackFunctionary } = useAuth();
  const canCover = area === "hockeyrink" ? isRinkFunctionary : isTrackFunctionary;
  const utils = trpc.useUtils();
  const cover = trpc.dutyTeams.coverAbsence.useMutation({
    onSuccess: (_r, vars) => {
      utils.dutyTeams.absences.invalidate();
      toast.success(vars.cover ? "Tack! Laget och admin har fått veta att du tar det." : "Ångrat – laget har meddelats.");
    },
    onError: (e) => {
      utils.dutyTeams.absences.invalidate();
      toast.error(e.message);
    },
  });
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
              absence={absence}
              canCover={canCover}
              pending={setAbsence.isPending || cover.isPending}
              onCover={(memberId, on) => {
                if (on && !confirm("Vill du hoppa in och ta passet?")) return;
                cover.mutate({ year: d.year, week: d.week, memberId, cover: on });
              }}
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
  absence,
  canCover,
  pending,
  onToggle,
  onCover,
}: {
  d: DutyWeek;
  isCurrent: boolean;
  isAbsent: (week: number, memberId: number) => boolean;
  absence: (week: number, memberId: number) => AbsenceInfo | undefined;
  canCover: boolean;
  pending: boolean;
  onToggle: (memberId: number, absent: boolean) => void;
  onCover: (memberId: number, cover: boolean) => void;
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
              const info = absence(d.week, m.id);
              return (
                <MemberLine key={m.id} name={m.name} phone={m.phone} absent={absent} coveredBy={info?.coveredByName}>
                  {absent && !m.isMe && canCover && !info?.coveredByName && (
                    <Button
                      size="sm"
                      className="ml-auto h-7 gap-1 text-xs"
                      disabled={pending}
                      onClick={() => onCover(m.id, true)}
                    >
                      <HandHelping className="h-3.5 w-3.5" /> Jag tar det
                    </Button>
                  )}
                  {info?.coveredByMe && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto h-7 text-xs"
                      disabled={pending}
                      onClick={() => onCover(m.id, false)}
                    >
                      Ångra
                    </Button>
                  )}
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
  coveredBy,
  children,
}: {
  name: string;
  phone: string | null;
  absent: boolean;
  /** Stand-in's name when the förhinder is solved. */
  coveredBy?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className={`font-semibold ${absent ? "line-through text-muted-foreground" : ""}`}>{name}</span>
      {absent &&
        (coveredBy ? (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <Check className="h-3 w-3" /> {coveredBy} tar det
          </span>
        ) : (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">Förhinder</span>
        ))}
      {phone && (
        <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-primary">
          <Phone className="h-3 w-3" /> {formatPhone(phone)}
        </a>
      )}
      {children}
    </li>
  );
}

/** Compact "this week" card used on the rink and ski-track pages. */
export function ThisWeekDuty({ area, href }: { area: DutyArea; href?: string }) {
  const [now] = useState(() => new Date());
  const { year, week } = getIsoWeek(now);
  const { weeks, isAbsent, absence, loading } = useDutyWeeks(area, year);
  const d = weeks.find((w) => w.week === week);
  const label = area === "hockeyrink" ? "Rinkjour" : "Spårjour";
  return (
    <div className="iso-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Vecka {week} · {label}
        </div>
        {href && (
          <Link href={href} className="text-sm font-semibold text-primary">
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
                  <MemberLine
                    key={m.id}
                    name={m.name}
                    phone={m.phone}
                    absent={isAbsent(week, m.id)}
                    coveredBy={absence(week, m.id)?.coveredByName}
                  />
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
