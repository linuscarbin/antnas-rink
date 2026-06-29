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

export default function AdminSkiDuty() {
  const utils = trpc.useUtils();
  const [now] = useState(() => new Date());
  const current = getIsoWeek(now);
  const [year, setYear] = useState(current.year);
  const dutyQuery = trpc.skiDuty.list.useQuery({ year });
  const membersQuery = trpc.users.listForAssignment.useQuery();
  const members = membersQuery.data ?? [];

  const [week, setWeek] = useState(current.week);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("none");

  const upsert = trpc.skiDuty.upsert.useMutation({
    onSuccess: () => {
      utils.skiDuty.list.invalidate();
      toast.success("Spårjour sparad.");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.skiDuty.delete.useMutation({
    onSuccess: () => {
      utils.skiDuty.list.invalidate();
      toast.success("Spårjour borttagen.");
    },
    onError: (e) => toast.error(e.message),
  });

  function memberField(id: string, field: "name" | "phone") {
    const m = members.find((x) => String(x.id) === id);
    return (field === "name" ? m?.name : m?.phone) ?? "";
  }

  function save() {
    upsert.mutate({
      year,
      week,
      sparjourName:
        userId !== "none" ? memberField(userId, "name") || name : name || null,
      sparjourPhone:
        userId !== "none" ? memberField(userId, "phone") || phone : phone || null,
      sparjourUserId: userId !== "none" ? Number(userId) : null,
    });
  }

  const weekOptions = useMemo(
    () => Array.from({ length: 53 }, (_, i) => i + 1),
    []
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="iso-card p-6 h-fit">
        <h3 className="font-extrabold text-lg">Lägg till / uppdatera spårjour</h3>
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

          <div className="space-y-1.5">
            <Label className="text-xs">Koppla medlem (valfritt)</Label>
            <Select value={userId} onValueChange={setUserId}>
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
          </div>

          {userId === "none" && (
            <>
              <Input
                placeholder="Namn"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Telefon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </>
          )}

          <Button
            className="w-full font-semibold"
            onClick={save}
            disabled={upsert.isPending}
          >
            Spara spårjour för vecka {week}
          </Button>
          <p className="text-xs text-muted-foreground">
            Skidspåret har egen jourgrupp, skild från rinkens plog-/spoljour.
          </p>
        </div>
      </div>

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
            <Skeleton className="h-16 rounded-xl" />
          ) : dutyQuery.data && dutyQuery.data.length > 0 ? (
            dutyQuery.data.map((d) => (
              <div key={d.id} className="iso-card p-4 flex items-center gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary font-extrabold shrink-0">
                  v{d.week}
                </span>
                <div className="flex-1 min-w-0 text-sm">
                  <span className="font-semibold">Spårjour:</span>{" "}
                  {d.sparjourName || "—"}{" "}
                  {d.sparjourConflict && (
                    <span className="text-destructive font-bold">(förhinder)</span>
                  )}
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
              Inget spårjour-schema för {year} ännu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
