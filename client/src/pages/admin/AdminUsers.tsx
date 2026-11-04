import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatPhone, parseMemberLines } from "@shared/user";
import { Copy, KeyRound, MessageCircle, Search, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const AREA_SHORT: Record<string, string> = { hockeyrink: "Rink", skidspar: "Spår" };

export default function AdminUsers() {
  const utils = trpc.useUtils();
  const usersQuery = trpc.users.list.useQuery();
  const rinkTeams = trpc.dutyTeams.list.useQuery({ area: "hockeyrink" });
  const skiTeams = trpc.dutyTeams.list.useQuery({ area: "skidspar" });
  const teams = [
    ...(rinkTeams.data ?? []).map((t) => ({ id: t.id, label: `Rink: ${t.name}` })),
    ...(skiTeams.data ?? []).map((t) => ({ id: t.id, label: `Spår: ${t.name}` })),
  ];

  const refresh = () => {
    utils.users.list.invalidate();
    utils.users.listForAssignment.invalidate();
    utils.dutyTeams.list.invalidate();
  };
  const onError = (e: { message: string }) => toast.error(e.message);
  const setRole = trpc.users.setRole.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Roll uppdaterad.");
    },
    onError,
  });
  const link = trpc.users.accountLink.useMutation({ onError });

  // --- Import from the WhatsApp group ---
  const [importOpen, setImportOpen] = useState(false);
  const [lines, setLines] = useState("");
  const [teamId, setTeamId] = useState("none");
  const parsed = useMemo(() => parseMemberLines(lines), [lines]);
  const bulk = trpc.users.bulkCreate.useMutation({
    onSuccess: (r) => {
      refresh();
      const created = r.filter((x) => x.status === "created").length;
      const existed = r.filter((x) => x.status === "exists").length;
      toast.success(`${created} konton skapade${existed ? `, ${existed} fanns redan` : ""}. Skicka länkarna nedan.`);
      setLines("");
      setImportOpen(false);
    },
    onError,
  });

  const [q, setQ] = useState("");
  const users = (usersQuery.data ?? []).filter((u) =>
    `${u.name ?? ""} ${u.email ?? ""} ${u.phone ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );
  const waiting = (usersQuery.data ?? []).filter((u) => !u.passwordSet).length;

  async function sendLink(id: number, how: "whatsapp" | "copy") {
    const r = await link.mutateAsync({ id });
    if (how === "whatsapp" && r.whatsappUrl) {
      window.open(r.whatsappUrl, "_blank", "noopener");
    } else {
      try {
        await navigator.clipboard.writeText(r.text);
        toast.success("Meddelandet med länken är kopierat – klistra in det i WhatsApp/SMS.");
      } catch {
        prompt("Kopiera meddelandet:", r.text);
      }
    }
    utils.users.list.invalidate();
  }

  return (
    <div className="grid gap-4 max-w-3xl">
      <div className="iso-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold">Konton</h3>
            <p className="text-sm text-muted-foreground">
              Vem som helst kan skapa konto och boka/skriva på tavlan. Jourhavare
              får sina rättigheter genom att vara med i ett lag.
            </p>
          </div>
          {!importOpen && (
            <Button size="sm" className="gap-1" onClick={() => setImportOpen(true)}>
              <UserPlus className="h-4 w-4" /> Lägg till flera
            </Button>
          )}
        </div>

        {importOpen && (
          <div className="mt-4 grid gap-3">
            <p className="text-sm">
              Klistra in namn och telefonnummer (eller bara nummer), en person per
              rad – t.ex. från WhatsApp-gruppen. Alla får ett konto och en personlig länk där de
              väljer eget lösenord.
            </p>
            <Textarea
              rows={6}
              value={lines}
              onChange={(e) => setLines(e.target.value)}
              placeholder={"Lisa Andersson 070-123 45 67\nOlle Berg, 0709876543"}
              className="font-mono text-sm"
            />
            {parsed.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-card p-2 text-sm">
                {parsed.map((p, i) => (
                  <li key={i} className={p.phone ? "" : "text-destructive"}>
                    {p.name || <span className="text-muted-foreground">(namn fylls i av personen)</span>} –{" "}
                    {p.phone ? formatPhone(p.phone) : "inget giltigt nummer"}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Lägg i lag:</span>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="w-56 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Inget lag (bara konto)</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={bulk.isPending || parsed.filter((p) => p.phone).length === 0}
                onClick={() =>
                  bulk.mutate({
                    people: parsed.filter((p) => p.phone).map((p) => ({ name: p.name, phone: p.phone! })),
                    teamId: teamId === "none" ? null : Number(teamId),
                  })
                }
              >
                Skapa {parsed.filter((p) => p.phone).length} konton
              </Button>
              <Button variant="ghost" onClick={() => setImportOpen(false)}>
                Avbryt
              </Button>
            </div>
          </div>
        )}
      </div>

      {waiting > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <strong>{waiting}</strong> {waiting === 1 ? "person har" : "personer har"} inte valt lösenord än.
          Tryck <strong>WhatsApp</strong> för att skicka deras personliga länk.
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök namn, telefon eller e-post" className="pl-9 bg-card" />
      </div>

      {usersQuery.isLoading ? (
        <>
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </>
      ) : (
        users.map((u) => (
          <div key={u.id} className="iso-card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-extrabold text-primary">
              {(u.name || u.email || u.phone || "?").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                <span className="truncate">{u.name || formatPhone(u.phone) || "Namnlös"}</span>
                {u.role === "admin" && <Badge className="bg-primary">Admin</Badge>}
                {u.teams.map((t) => (
                  <Badge key={`${t.area}-${t.name}`} variant="secondary">
                    {AREA_SHORT[t.area]}: {t.name}
                  </Badge>
                ))}
                {!u.passwordSet && (
                  <Badge variant="outline" className="border-amber-400 text-amber-700">
                    Inte aktiverat
                  </Badge>
                )}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {[formatPhone(u.phone), u.email].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            {/* Own row on phones, beside the name on wider screens. */}
            <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:ml-auto sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 bg-card"
                disabled={link.isPending || !u.phone}
                title={u.passwordSet ? "Skicka länk för nytt lösenord" : "Skicka inbjudan"}
                onClick={() => sendLink(u.id, "whatsapp")}
              >
                <MessageCircle className="h-4 w-4" />
                {u.passwordSet ? <KeyRound className="h-3.5 w-3.5" /> : null}
                WhatsApp
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={link.isPending}
                title={u.passwordSet ? "Kopiera länk för nytt lösenord" : "Kopiera inbjudan"}
                aria-label="Kopiera länk"
                onClick={() => sendLink(u.id, "copy")}
              >
                <Copy className="h-4 w-4" />
              </Button>
              {u.role === "admin" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => setRole.mutate({ id: u.id, role: "user" })}
                  disabled={setRole.isPending}
                  title="Ta bort admin"
                >
                  <ShieldOff className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    if (confirm(`Göra ${u.name || "personen"} till admin? Admin har full kontroll.`)) {
                      setRole.mutate({ id: u.id, role: "admin" });
                    }
                  }}
                  disabled={setRole.isPending}
                  title="Gör till admin"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
