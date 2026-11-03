import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { getIsoWeek } from "@shared/rink";
import { Pencil, Plus, Shuffle, Trash2, UserPlus, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1);

export default function AdminDuty() {
  const utils = trpc.useUtils();
  const [now] = useState(() => new Date());
  const current = getIsoWeek(now);
  const [year, setYear] = useState(current.year);
  const dutyQuery = trpc.duty.list.useQuery({ year });
  const teamsQuery = trpc.rinkTeams.list.useQuery();
  const absencesQuery = trpc.rinkTeams.absences.useQuery({ year });
  const membersQuery = trpc.users.listForAssignment.useQuery();
  const teams = teamsQuery.data ?? [];
  const users = membersQuery.data ?? [];

  const refresh = () => {
    utils.rinkTeams.list.invalidate();
    utils.duty.list.invalidate();
    utils.rinkTeams.absences.invalidate();
    utils.auth.me.invalidate();
  };
  const onError = (e: { message: string }) => toast.error(e.message);

  const createTeam = trpc.rinkTeams.create.useMutation({ onSuccess: refresh, onError });
  const renameTeam = trpc.rinkTeams.rename.useMutation({ onSuccess: refresh, onError });
  const deleteTeam = trpc.rinkTeams.delete.useMutation({ onSuccess: refresh, onError });
  const addMember = trpc.rinkTeams.addMember.useMutation({ onSuccess: refresh, onError });
  const removeMember = trpc.rinkTeams.removeMember.useMutation({ onSuccess: refresh, onError });
  const upsert = trpc.duty.upsert.useMutation({ onSuccess: refresh, onError });
  const del = trpc.duty.delete.useMutation({ onSuccess: refresh, onError });
  const rotate = trpc.duty.rotate.useMutation({
    onSuccess: (r) => {
      refresh();
      toast.success(`${r.weeks} veckor fördelade.`);
    },
    onError,
  });

  // --- Rotation form (default: rest of this winter season → v12) ---
  const defaultToYear = current.week > 30 ? current.year + 1 : current.year;
  const [fromYear, setFromYear] = useState(current.year);
  const [fromWeek, setFromWeek] = useState(current.week);
  const [toYear, setToYear] = useState(defaultToYear);
  const [toWeek, setToWeek] = useState(12);
  const [startTeam, setStartTeam] = useState<string>("");

  const [newTeam, setNewTeam] = useState("");

  const teamName = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);
  const absentByWeek = useMemo(() => {
    const m = new Map<number, number>();
    (absencesQuery.data ?? []).forEach((a) => m.set(a.week, (m.get(a.week) ?? 0) + 1));
    return m;
  }, [absencesQuery.data]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Teams */}
      <div className="iso-card p-6 h-fit">
        <h3 className="flex items-center gap-2 font-extrabold text-lg">
          <Users className="h-5 w-5 text-primary" /> Jourlag
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Varje lag har rinkjour en vecka i taget och plogar/spolar efter behov.
          Koppla medlemmar till sina konton så får de markera status, se guider
          och få påminnelser.
        </p>

        <div className="mt-4 flex gap-2">
          <Input
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder={`T.ex. Lag ${teams.length + 1}`}
          />
          <Button
            className="gap-1"
            disabled={!newTeam.trim() || createTeam.isPending}
            onClick={() => createTeam.mutate({ name: newTeam.trim() }, { onSuccess: () => setNewTeam("") })}
          >
            <Plus className="h-4 w-4" /> Lag
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          {teamsQuery.isLoading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga lag ännu. Skapa t.ex. Lag 1–5.</p>
          ) : (
            teams.map((t) => (
              <TeamCard
                key={t.id}
                team={t}
                users={users}
                onRename={(name) => renameTeam.mutate({ id: t.id, name })}
                onDelete={() => {
                  if (confirm(`Ta bort ${t.name}? Veckor med laget blir utan lag.`)) {
                    deleteTeam.mutate({ id: t.id });
                  }
                }}
                onAdd={(m) => addMember.mutate({ teamId: t.id, ...m })}
                onRemove={(id) => removeMember.mutate({ id })}
              />
            ))
          )}
        </div>
      </div>

      <div className="grid gap-6 h-fit">
        {/* Rotation */}
        <div className="iso-card p-6">
          <h3 className="flex items-center gap-2 font-extrabold text-lg">
            <Shuffle className="h-5 w-5 text-primary" /> Fördela lagen
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Lagen får en vecka var i tur och ordning. Befintliga veckor i
            intervallet skrivs över.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <WeekPicker label="Från" year={fromYear} week={fromWeek} onYear={setFromYear} onWeek={setFromWeek} />
            <WeekPicker label="Till" year={toYear} week={toWeek} onYear={setToYear} onWeek={setToWeek} />
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>Börja med</Label>
            <Select value={startTeam || (teams[0] ? String(teams[0].id) : "")} onValueChange={setStartTeam}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Välj lag" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="mt-4 w-full gap-1.5"
            disabled={teams.length === 0 || rotate.isPending}
            onClick={() => {
              const startId = Number(startTeam || teams[0]?.id);
              rotate.mutate({
                from: { year: fromYear, week: fromWeek },
                to: { year: toYear, week: toWeek },
                teamIds: teams.map((t) => t.id),
                startIndex: Math.max(0, teams.findIndex((t) => t.id === startId)),
              });
            }}
          >
            <Shuffle className="h-4 w-4" /> Fördela lagen
          </Button>
        </div>

        {/* Week list */}
        <div className="iso-card p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-lg">Schema {year}</h3>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="bg-card" onClick={() => setYear((y) => y - 1)}>
                {year - 1}
              </Button>
              <Button variant="outline" size="sm" className="bg-card" onClick={() => setYear((y) => y + 1)}>
                {year + 1}
              </Button>
            </div>
          </div>
          <div className="mt-3 divide-y divide-border">
            {dutyQuery.isLoading ? (
              <Skeleton className="h-24" />
            ) : (dutyQuery.data ?? []).length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Inget schema för {year} ännu.</p>
            ) : (
              (dutyQuery.data ?? []).map((d) => {
                const legacy = !d.teamId && (d.plogjourName || d.spoljourName);
                return (
                  <div key={d.id} className="flex items-center gap-3 py-2">
                    <span
                      className={`grid h-9 w-11 shrink-0 place-items-center rounded-lg text-sm font-extrabold ${
                        year === current.year && d.week === current.week
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      v{d.week}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Select
                        value={d.teamId ? String(d.teamId) : "none"}
                        onValueChange={(v) =>
                          upsert.mutate({ year: d.year, week: d.week, teamId: v === "none" ? null : Number(v), note: d.note })
                        }
                      >
                        <SelectTrigger className="h-9 bg-card">
                          <SelectValue>
                            {d.teamId ? teamName.get(d.teamId) ?? "Okänt lag" : legacy ? "Äldre schema" : "Inget lag"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Inget lag</SelectItem>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {legacy && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[d.plogjourName, d.spoljourName].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                    {absentByWeek.get(d.week) ? (
                      <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">
                        {absentByWeek.get(d.week)} förhinder
                      </span>
                    ) : null}
                    <Button variant="ghost" size="icon" aria-label="Ta bort veckan" onClick={() => del.mutate({ id: d.id })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekPicker({
  label,
  year,
  week,
  onYear,
  onWeek,
}: {
  label: string;
  year: number;
  week: number;
  onYear: (y: number) => void;
  onWeek: (w: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        <Input
          type="number"
          className="w-20 bg-card"
          value={year}
          onChange={(e) => onYear(Number(e.target.value))}
          aria-label={`${label} år`}
        />
        <Select value={String(week)} onValueChange={(v) => onWeek(Number(v))}>
          <SelectTrigger className="bg-card" aria-label={`${label} vecka`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {WEEKS.map((w) => (
              <SelectItem key={w} value={String(w)}>
                v{w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

type TeamView = {
  id: number;
  name: string;
  members: { id: number; name: string; phone: string | null; linked: boolean }[];
};

function TeamCard({
  team,
  users,
  onRename,
  onDelete,
  onAdd,
  onRemove,
}: {
  team: TeamView;
  users: { id: number; name: string | null; email: string; phone: string | null }[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onAdd: (m: { userId?: number | null; name?: string; phone?: string }) => void;
  onRemove: (id: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [userId, setUserId] = useState("manual");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function submit() {
    if (userId !== "manual") onAdd({ userId: Number(userId) });
    else if (name.trim()) onAdd({ name: name.trim(), phone: phone.trim() || undefined });
    else return toast.error("Välj en medlem eller skriv ett namn.");
    setName("");
    setPhone("");
    setUserId("manual");
    setAdding(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-bold">{team.name}</span>
        <span className="text-xs text-muted-foreground">{team.members.length} pers</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Byt namn"
          onClick={() => {
            const n = prompt("Nytt namn på laget", team.name);
            if (n && n.trim()) onRename(n.trim());
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ta bort lag" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {team.members.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-sm"
            title={m.linked ? "Kopplad till konto" : "Ej kopplad till konto – får inga påminnelser"}
          >
            {m.name}
            {!m.linked && <span className="text-xs text-muted-foreground">(ej konto)</span>}
            <button
              className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
              aria-label={`Ta bort ${m.name}`}
              onClick={() => onRemove(m.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!adding && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setAdding(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Lägg till
          </Button>
        )}
      </div>
      {adding && (
        <div className="mt-3 grid gap-2">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Utan konto (skriv namn)</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {userId === "manual" && (
            <div className="grid grid-cols-2 gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn" />
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" />
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit}>
              Lägg till
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
