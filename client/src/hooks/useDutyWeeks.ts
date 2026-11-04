import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export type DutyArea = "hockeyrink" | "skidspar";

export type DutyWeek = {
  id: number;
  year: number;
  week: number;
  note: string | null;
  team?: {
    id: number;
    name: string;
    members: { id: number; name: string; phone: string | null; isMe: boolean }[];
  };
  /** Names from the old single-person schedule (before teams). */
  legacy: { name: string; phone: string | null; conflict: boolean }[];
};

export type AbsenceInfo = { coveredByName: string | null; coveredByMe: boolean };

/** Weekly duty (teams + absences) for the rink or the ski track. */
export function useDutyWeeks(area: DutyArea, year: number) {
  const rink = trpc.duty.list.useQuery({ year }, { enabled: area === "hockeyrink" });
  const ski = trpc.skiDuty.list.useQuery({ year }, { enabled: area === "skidspar" });
  const teamsQuery = trpc.dutyTeams.list.useQuery({ area });
  const absencesQuery = trpc.dutyTeams.absences.useQuery({ year, area });

  const weeks = useMemo<DutyWeek[]>(() => {
    const teams = new Map((teamsQuery.data ?? []).map((t) => [t.id, t]));
    if (area === "hockeyrink") {
      return (rink.data ?? []).map((d) => ({
        id: d.id,
        year: d.year,
        week: d.week,
        note: d.note,
        team: d.teamId ? teams.get(d.teamId) : undefined,
        legacy: [
          d.plogjourName && { name: d.plogjourName, phone: d.plogjourPhone, conflict: d.plogjourConflict },
          d.spoljourName && { name: d.spoljourName, phone: d.spoljourPhone, conflict: d.spoljourConflict },
        ].filter(Boolean) as DutyWeek["legacy"],
      }));
    }
    return (ski.data ?? []).map((d) => ({
      id: d.id,
      year: d.year,
      week: d.week,
      note: d.note,
      team: d.teamId ? teams.get(d.teamId) : undefined,
      legacy: d.sparjourName
        ? [{ name: d.sparjourName, phone: d.sparjourPhone, conflict: d.sparjourConflict }]
        : [],
    }));
  }, [area, rink.data, ski.data, teamsQuery.data]);

  const absent = useMemo(
    () => new Map((absencesQuery.data ?? []).map((a) => [`${a.week}:${a.memberId}`, a])),
    [absencesQuery.data]
  );

  return {
    weeks,
    isAbsent: (week: number, memberId: number) => absent.has(`${week}:${memberId}`),
    /** Absence details incl. the stand-in ("Lisa tar det"), if any. */
    absence: (week: number, memberId: number): AbsenceInfo | undefined => absent.get(`${week}:${memberId}`),
    loading: (area === "hockeyrink" ? rink.isLoading : ski.isLoading) || teamsQuery.isLoading,
  };
}
