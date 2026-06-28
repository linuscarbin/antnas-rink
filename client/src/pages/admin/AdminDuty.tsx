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
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function AdminDuty() {
  const utils = trpc.useUtils();
  const [now] = useState(() => new Date());
  const current = getIsoWeek(now);
  const [year, setYear] = useState(current.year);
  const dutyQuery = trpc.duty.list.useQuery({ year });
  const membersQuery = trpc.users.listForAssignment.useQuery();

  const [week, setWeek] = useState(current.week);
  const [plogName, setPlogName] = useState("");
  const [plogPhone, setPlogPhone] = useState("");
  const [plogUser, setPlogUser] = useState<string>("none");
  const [spolName, setSpolName] = useState("");
  const [spolPhone, setSpolPhone] = useState("");
  const [spolUser, setSpolUser] = useState<string>("none");

  const members = membersQuery.data ?? [];

  const upsert = trpc.duty.upsert.useMutation({
    onSuccess: () => {
      utils.duty.list.invalidate();
      toast.success("Jour sparad.");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.duty.delete.useMutation({
    onSuccess: () => {
      utils.duty.list.invalidate();
      toast.success("Jour borttagen.");
    },
    onError: (e) => toast.error(e.message),
  });

  function memberName(id: string) {
    const m = members.find((x) => String(x.id) === id);
    return m?.name ?? "";
  }
  function memberPhone(id: string) {
    const m = members.find((x) => String(x.id) === id);
    return m?.phone ?? "";
  }

  function save() {
    upsert.mutate({
      year,
      week,
      plogjourName: plogUser !== "none" ? memberName(plogUser) || plogName : plogName || null,
      plogjourPhone: plogUser !== "none" ? memberPhone(plogUser) || plogPhone : plogPhone || null,
      plogjourUserId: plogUser !== "none" ? Number(plogUser) : null,
      spoljourName: spolUser !== "none" ? memberName(spolUser) || spolName : spolName || null,
      spoljourPhone: spolUser !== "none" ? memberPhone(spolUser) || spolPhone : spolPhone || null,
      spoljourUserId: spolUser !== "none" ? Number(spolUser) : null,
    });
  }

  const weekOptions = useMemo(
    () => Array.from({ length: 53 }, (_, i) => i + 1),
    []
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Form */}
      <div className="iso-card p-6 lg:col-span-1 h-fit">
        <h3 className="font-extrabold text-lg">Lägg till / uppdatera jour</h3>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>År</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vecka</Label>
              <Select value={String(week)} onValueChange={(v) => setWeek(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {weekOptions.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      Vecka {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="rounded-xl border border-border/70 p-3 space-y-2">
            <legend className="px-1 text-sm font-bold text-primary">Plogjour</legend>
            <Label className="text-xs">Koppla medlem (valfritt)</Label>
            <Select value={plogUser} onValueChange={setPlogUser}>
              <SelectTrigger>
                <SelectValue placeholder="Ingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manuell inmatning</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {plogUser === "none" && (
              <>
                <Input
                  placeholder="Namn"
                  value={plogName}
                  onChange={(e) => setPlogName(e.target.value)}
                />
                <Input
                  placeholder="Telefon"
                  value={plogPhone}
                  onChange={(e) => setPlogPhone(e.target.value)}
                />
              </>
            )}
          </fieldset>

          <fieldset className="rounded-xl border border-border/70 p-3 space-y-2">
            <legend className="px-1 text-sm font-bold text-primary">Spoljour</legend>
            <Label className="text-xs">Koppla medlem (valfritt)</Label>
            <Select value={spolUser} onValueChange={setSpolUser}>
              <SelectTrigger>
                <SelectValue placeholder="Ingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manuell inmatning</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {spolUser === "none" && (
              <>
                <Input
                  placeholder="Namn"
                  value={spolName}
                  onChange={(e) => setSpolName(e.target.value)}
                />
                <Input
                  placeholder="Telefon"
                  value={spolPhone}
                  onChange={(e) => setSpolPhone(e.target.value)}
                />
              </>
            )}
          </fieldset>

          <Button
            className="w-full font-semibold"
            onClick={save}
            disabled={upsert.isPending}
          >
            Spara jour för vecka {week}
          </Button>
          <p className="text-xs text-muted-foreground">
            Tips: koppla en medlem så får hen automatiska e-postpåminnelser och
            kan anmäla förhinder själv.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            onClick={() => setYear((y) => y - 1)}
          >
            {year - 1}
          </Button>
          <span className="font-extrabold w-14 text-center">{year}</span>
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            onClick={() => setYear((y) => y + 1)}
          >
            {year + 1}
          </Button>
        </div>
        <div className="space-y-2">
          {dutyQuery.isLoading ? (
            <>
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </>
          ) : dutyQuery.data && dutyQuery.data.length > 0 ? (
            dutyQuery.data.map((d) => (
              <div key={d.id} className="iso-card p-4 flex items-center gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary font-extrabold shrink-0">
                  v{d.week}
                </span>
                <div className="flex-1 min-w-0 text-sm">
                  <div>
                    <span className="font-semibold">Plog:</span>{" "}
                    {d.plogjourName || "—"}{" "}
                    {d.plogjourConflict && (
                      <span className="text-destructive font-bold">(förhinder)</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">Spol:</span>{" "}
                    {d.spoljourName || "—"}{" "}
                    {d.spoljourConflict && (
                      <span className="text-destructive font-bold">(förhinder)</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => del.mutate({ id: d.id })}
                  aria-label="Ta bort"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          ) : (
            <div className="iso-card p-8 text-center text-muted-foreground">
              Inget schema för {year} ännu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
