import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDay, formatTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import {
  CalendarPlus,
  Copy,
  Link2,
  Lock,
  Shuffle,
  Sun,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function AdminBingo() {
  const utils = trpc.useUtils();
  const [season, setSeason] = useState(() => new Date().getFullYear());

  const seasonQuery = trpc.settings.getSeason.useQuery();
  const setSeasonMode = trpc.settings.setSeason.useMutation({
    onSuccess: () => {
      utils.settings.getSeason.invalidate();
      toast.success("Säsong uppdaterad.");
    },
    onError: (e) => toast.error(e.message),
  });

  const occasionsQuery = trpc.bingo.listOccasions.useQuery({ season });
  const teamsQuery = trpc.bingo.listTeams.useQuery();
  const familiesQuery = trpc.bingo.listFamilies.useQuery({});
  const assignmentsQuery = trpc.bingo.listAssignments.useQuery();

  const familyById = useMemo(() => {
    const m = new Map<number, { parentName: string; phone: string | null; teamId: number }>();
    for (const f of familiesQuery.data ?? [])
      m.set(f.id, { parentName: f.parentName, phone: f.phone, teamId: f.teamId });
    return m;
  }, [familiesQuery.data]);

  const assignmentsByOccasion = useMemo(() => {
    const m = new Map<number, typeof assignmentsQuery.data>();
    for (const a of assignmentsQuery.data ?? []) {
      const arr = m.get(a.occasionId) ?? [];
      arr.push(a);
      m.set(a.occasionId, arr);
    }
    return m;
  }, [assignmentsQuery.data]);

  const totalActive = useMemo(
    () => (familiesQuery.data ?? []).reduce((s, f) => s + f.activeCount, 0),
    [familiesQuery.data]
  );

  // --- Occasion form ---
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const [location, setLocation] = useState("Antnäs IP");
  const [target, setTarget] = useState("20");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");

  const createOccasion = trpc.bingo.createOccasion.useMutation({
    onSuccess: () => {
      utils.bingo.listOccasions.invalidate();
      setDate("");
      toast.success("Tillfälle tillagt.");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteOccasion = trpc.bingo.deleteOccasion.useMutation({
    onSuccess: () => {
      utils.bingo.listOccasions.invalidate();
      utils.bingo.listAssignments.invalidate();
      toast.success("Tillfälle borttaget.");
    },
    onError: (e) => toast.error(e.message),
  });

  // --- Teams ---
  const [teamName, setTeamName] = useState("");
  const createTeam = trpc.bingo.createTeam.useMutation({
    onSuccess: () => {
      utils.bingo.listTeams.invalidate();
      setTeamName("");
      toast.success("Lag skapat.");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteTeam = trpc.bingo.deleteTeam.useMutation({
    onSuccess: () => {
      utils.bingo.listTeams.invalidate();
      utils.bingo.listFamilies.invalidate();
      toast.success("Lag borttaget.");
    },
    onError: (e) => toast.error(e.message),
  });

  // --- Distribution ---
  const distribute = trpc.bingo.distribute.useMutation({
    onSuccess: (r) => {
      utils.bingo.listAssignments.invalidate();
      toast.success(`Fördelning klar: ${r.added} pass tillagda.`);
    },
    onError: (e) => toast.error(e.message),
  });
  const removeAssignment = trpc.bingo.removeAssignment.useMutation({
    onSuccess: () => utils.bingo.listAssignments.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const lockAssignment = trpc.bingo.setAssignmentLocked.useMutation({
    onSuccess: () => utils.bingo.listAssignments.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const addAssignment = trpc.bingo.addAssignment.useMutation({
    onSuccess: () => {
      utils.bingo.listAssignments.invalidate();
      toast.success("Pass tillagt (låst).");
    },
    onError: (e) => toast.error(e.message),
  });
  const [addTo, setAddTo] = useState<{ occasionId: number; familyId: string }>({
    occasionId: 0,
    familyId: "",
  });

  function addOccasion() {
    if (!date) return toast.error("Välj datum.");
    const dt = new Date(`${date}T${time || "17:00"}`);
    createOccasion.mutate({
      season,
      occasionDate: dt.getTime(),
      location: location || undefined,
      targetCount: parseInt(target, 10) || 20,
      leadName: leadName || undefined,
      leadPhone: leadPhone || undefined,
    });
    setLeadName("");
    setLeadPhone("");
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/lag/${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Länk kopierad!"),
      () => toast.error("Kunde inte kopiera.")
    );
  }

  const totalTarget = (occasionsQuery.data ?? []).reduce(
    (s, o) => s + o.targetCount,
    0
  );

  return (
    <div className="space-y-8">
      {/* Season switch */}
      <div className="iso-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="h-5 w-5 text-primary" />
          <h3 className="font-extrabold text-lg">Aktiv säsong på sajten</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Styr vad besökare möts av på startsidan och i menyn. Båda säsongerna går
          alltid att nå.
        </p>
        <div className="flex gap-2">
          {(["vinter", "sommar"] as const).map((s) => (
            <Button
              key={s}
              variant={seasonQuery.data?.season === s ? "default" : "outline"}
              className={seasonQuery.data?.season === s ? "" : "bg-card"}
              onClick={() => setSeasonMode.mutate({ season: s })}
            >
              {s === "vinter" ? "Vinter" : "Sommar"}
            </Button>
          ))}
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">
          Bilbingo-säsong:
        </span>
        <Button variant="outline" size="sm" className="bg-card" onClick={() => setSeason((y) => y - 1)}>
          {season - 1}
        </Button>
        <span className="font-extrabold w-14 text-center">{season}</span>
        <Button variant="outline" size="sm" className="bg-card" onClick={() => setSeason((y) => y + 1)}>
          {season + 1}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Occasions */}
        <div className="iso-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarPlus className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold text-lg">Tillfällen</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tid</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plats</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mål antal</Label>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kvällsansvarig</Label>
              <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Namn" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ansvarigs telefon</Label>
              <Input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="070-..." />
            </div>
          </div>
          <Button className="w-full font-semibold" onClick={addOccasion} disabled={createOccasion.isPending}>
            Lägg till tillfälle
          </Button>

          <div className="mt-4 space-y-2">
            {occasionsQuery.isLoading ? (
              <Skeleton className="h-12 rounded-xl" />
            ) : (
              (occasionsQuery.data ?? []).map((o) => (
                <div key={o.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
                  <span className="text-sm font-semibold capitalize flex-1">
                    {formatDay(o.occasionDate)}, kl {formatTime(o.occasionDate)}
                    {o.leadName && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        Ansvarig: {o.leadName}
                        {o.leadPhone ? ` · ${o.leadPhone}` : ""}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">mål {o.targetCount}</span>
                  <Button variant="ghost" size="icon" aria-label="Ta bort" onClick={() => deleteOccasion.mutate({ id: o.id })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Teams */}
        <div className="iso-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold text-lg">Lag &amp; delningslänkar</h3>
          </div>
          <div className="flex gap-2 mb-3">
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="T.ex. Antnäs Hockey P10"
            />
            <Button onClick={() => teamName.trim() && createTeam.mutate({ name: teamName.trim() })} disabled={createTeam.isPending}>
              Skapa
            </Button>
          </div>
          <div className="space-y-2">
            {teamsQuery.isLoading ? (
              <Skeleton className="h-12 rounded-xl" />
            ) : (teamsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga lag skapade ännu.</p>
            ) : (
              (teamsQuery.data ?? []).map((t) => {
                const famCount = (familiesQuery.data ?? []).filter((f) => f.teamId === t.id).length;
                return (
                  <div key={t.id} className="rounded-lg border border-border/60 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold flex-1">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{famCount} familjer</span>
                      <Button variant="ghost" size="icon" aria-label="Kopiera länk" onClick={() => copyLink(t.shareToken)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Ta bort" onClick={() => deleteTeam.mutate({ id: t.id })}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      <span className="truncate">/lag/{t.shareToken.slice(0, 12)}…</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="iso-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-primary" />
            <h3 className="font-extrabold text-lg">Fördela arbetspass</h3>
          </div>
          <Button
            onClick={() => distribute.mutate({ season })}
            disabled={distribute.isPending}
            className="font-semibold gap-1.5"
          >
            <Shuffle className="h-4 w-4" />
            Fördela automatiskt
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {totalActive} aktiva barn i {teamsQuery.data?.length ?? 0} lag ·{" "}
          {totalTarget} platser att fylla över {occasionsQuery.data?.length ?? 0}{" "}
          tillfällen. Pass fördelas proportionellt mot antal aktiva. Manuellt
          tillagda pass bevaras.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {(occasionsQuery.data ?? []).map((o) => {
            const list = assignmentsByOccasion.get(o.id) ?? [];
            const full = list.length >= o.targetCount;
            return (
              <div key={o.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold capitalize text-sm">
                    {formatDay(o.occasionDate)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      full ? "bg-primary/15 text-primary" : "bg-amber-500/10 text-amber-700"
                    }`}
                  >
                    {list.length}/{o.targetCount}
                  </span>
                </div>
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Inga pass ännu.</p>
                  ) : (
                    list.map((a) => {
                      const fam = familyById.get(a.familyId);
                      return (
                        <div key={a.id} className="flex items-center gap-2 text-sm">
                          <button
                            onClick={() =>
                              lockAssignment.mutate({ id: a.id, locked: !a.locked })
                            }
                            aria-label={a.locked ? "Lås upp" : "Lås"}
                            title={
                              a.locked
                                ? "Låst (bevaras vid omfördelning)"
                                : "Lås detta pass"
                            }
                            className={
                              a.locked ? "text-primary" : "text-muted-foreground"
                            }
                          >
                            {a.locked ? (
                              <Lock className="h-3.5 w-3.5" />
                            ) : (
                              <Unlock className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="flex-1 min-w-0 truncate">
                            {fam?.parentName ?? `Familj #${a.familyId}`}
                            {fam?.phone && (
                              <span className="text-muted-foreground"> · {fam.phone}</span>
                            )}
                          </span>
                          <button
                            onClick={() => removeAssignment.mutate({ id: a.id })}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Ta bort pass"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Manual add */}
                <div className="mt-2 flex gap-1.5">
                  <select
                    className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
                    value={addTo.occasionId === o.id ? addTo.familyId : ""}
                    onChange={(e) =>
                      setAddTo({ occasionId: o.id, familyId: e.target.value })
                    }
                  >
                    <option value="">Lägg till familj manuellt…</option>
                    {(familiesQuery.data ?? []).map((f) => (
                      <option key={f.id} value={String(f.id)}>
                        {f.parentName}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-card"
                    disabled={addTo.occasionId !== o.id || !addTo.familyId}
                    onClick={() => {
                      addAssignment.mutate({
                        occasionId: o.id,
                        familyId: Number(addTo.familyId),
                        locked: true,
                      });
                      setAddTo({ occasionId: 0, familyId: "" });
                    }}
                  >
                    Lägg till
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
