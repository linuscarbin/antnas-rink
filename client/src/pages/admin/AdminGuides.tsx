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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Area = "publik" | "alla" | "hockeyrink" | "skidspar";

const AREA_LABEL: Record<Area, string> = {
  publik: "Alla besökare (Regler & info)",
  alla: "Alla jourhavare",
  hockeyrink: "Rinken (plog/spol)",
  skidspar: "Skidspåret",
};

/** Starter templates so admins don't face an empty page. */
const TEMPLATES: { title: string; area: Area; body: string }[] = [
  {
    title: "Ordningsregler på rinken",
    area: "publik",
    body: "## Ordningsregler\n\n- Visa hänsyn – små barn och skridskoåkare går före puck när det är trångt\n- Hjälm rekommenderas för barn\n- Inga bilar, skotrar eller cyklar på isen\n- Ta med skräp hem\n- Bokade tider gäller – se *Boka*\n",
  },
  {
    title: "Ställa bort målen",
    area: "publik",
    body: "## Ställ bort målen efter dig\n\nMålen ska stå **utanför sargen** när du går hem, annars fryser de fast och är i vägen för plogen.\n\n1. \n2. \n",
  },
  {
    title: "Ploga själv",
    area: "publik",
    body: "## Vill du skotta/ploga själv?\n\nToppen! Tänk på:\n\n- Använd skrapor/skyfflar från \n- Skotta **inte** in snön mot sargen på kortsidorna\n- \n",
  },
  {
    title: "Var ska snön läggas?",
    area: "publik",
    body: "## Var ska snön?\n\nLägg snön **här**: \n\nInte här: \n\nAnnars blir det svårt för plogjouren nästa gång.\n",
  },
  {
    title: "Koppla plogen",
    area: "hockeyrink",
    body: "## Så kopplar du plogen\n\n1. \n2. \n3. \n\n**Tänk på:** \n",
  },
  {
    title: "Spoltanken – fylla på vatten",
    area: "hockeyrink",
    body: "## Var fyller man vatten?\n\n\n## Så kopplar du spoltanken\n\n1. \n2. \n\n## Så spolar du\n\n- Bästa temperatur: under -5°\n- \n",
  },
  {
    title: "Förråd och nycklar",
    area: "alla",
    body: "## Förrådskod\n\n**Kod:** \n\n## Var finns nycklar?\n\n",
  },
  {
    title: "Viktiga kontakter",
    area: "alla",
    body: "## Kontakter\n\n- **Traktor:** namn – [070-000 00 00](tel:0700000000)\n- **Ansvarig rinken:** \n- **Ansvarig spåret:** \n",
  },
  {
    title: "Vad förväntas av jouren?",
    area: "alla",
    body: "## Din jourvecka\n\n- Kolla väder och snö varje dag\n- Ploga efter snöfall\n- Markera **plogad/spolad/draget** på sidan när du är klar\n- Registrera tankning och spara kvittot under *Funktionär*\n- Kan du inte? Anmäl förhinder i schemat i god tid\n",
  },
];

type Draft = { id?: number; title: string; area: Area; body: string; sortOrder: number };

const EMPTY: Draft = { title: "", area: "alla", body: "", sortOrder: 0 };

export default function AdminGuides() {
  const utils = trpc.useUtils();
  const listQuery = trpc.guides.adminList.useQuery();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const done = (msg: string) => {
    utils.guides.adminList.invalidate();
    utils.guides.list.invalidate();
    setDraft(null);
    toast.success(msg);
  };
  const create = trpc.guides.create.useMutation({
    onSuccess: () => done("Guiden är sparad."),
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.guides.update.useMutation({
    onSuccess: () => done("Guiden är uppdaterad."),
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.guides.delete.useMutation({
    onSuccess: () => done("Guiden är borttagen."),
    onError: (e) => toast.error(e.message),
  });

  function save() {
    if (!draft) return;
    if (!draft.title.trim()) return toast.error("Ange en rubrik.");
    const data = { title: draft.title, area: draft.area, body: draft.body, sortOrder: draft.sortOrder };
    if (draft.id) update.mutate({ id: draft.id, ...data });
    else create.mutate(data);
  }

  async function insertImage(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Uppladdning misslyckades.");
      const md = `\n![${file.name.replace(/\.[^.]+$/, "")}](${data.url})\n`;
      setDraft((d) => {
        if (!d) return d;
        const el = bodyRef.current;
        const pos = el ? el.selectionStart : d.body.length;
        return { ...d, body: d.body.slice(0, pos) + md + d.body.slice(pos) };
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdning misslyckades.");
    } finally {
      setUploading(false);
    }
  }

  const guides = listQuery.data ?? [];
  const pending = create.isPending || update.isPending;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="iso-card p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Guider för jourhavare</h2>
          <Button size="sm" onClick={() => setDraft({ ...EMPTY })} className="gap-1">
            <Plus className="h-4 w-4" /> Ny guide
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Syns bara för admin och de som är inlagda i jourschemat för området.
          Bra för förrådskod, hur man kopplar plogen, var man fyller vatten och
          viktiga kontakter.
        </p>

        {listQuery.isLoading ? (
          <Skeleton className="mt-4 h-24" />
        ) : guides.length === 0 ? (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Inga guider ännu. Börja från en mall:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <Button
                  key={t.title}
                  size="sm"
                  variant="outline"
                  className="bg-card"
                  onClick={() => setDraft({ ...t, sortOrder: 0 })}
                >
                  {t.title}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {guides.map((g) => (
              <li key={g.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{g.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {AREA_LABEL[g.area]}
                    {g.updatedByName ? ` · senast ändrad av ${g.updatedByName}` : ""}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Redigera"
                  onClick={() =>
                    setDraft({ id: g.id, title: g.title, area: g.area, body: g.body, sortOrder: g.sortOrder })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Ta bort"
                  onClick={() => {
                    if (confirm(`Ta bort guiden "${g.title}"?`)) remove.mutate({ id: g.id });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {guides.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Fler mallar:</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TEMPLATES.filter((t) => !guides.some((g) => g.title === t.title)).map((t) => (
                <Button
                  key={t.title}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setDraft({ ...t, sortOrder: guides.length })}
                >
                  + {t.title}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {draft && (
        <div className="iso-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold">{draft.id ? "Redigera guide" : "Ny guide"}</h3>
            <Button size="icon" variant="ghost" aria-label="Stäng" onClick={() => setDraft(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-1.5">
              <Label>Rubrik</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="T.ex. Koppla plogen"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="grid gap-1.5">
                <Label>Vem ser guiden?</Label>
                <Select value={draft.area} onValueChange={(v) => setDraft({ ...draft, area: v as Area })}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
                      <SelectItem key={a} value={a}>
                        {AREA_LABEL[a]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Ordning</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Innehåll</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-card h-7 gap-1 text-xs"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  Infoga bild
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) insertImage(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <Textarea
                ref={bodyRef}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={14}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formatering: <code>## Rubrik</code>, <code>**fet**</code>, <code>- punkt</code>,{" "}
                <code>1. steg</code>, länk till telefon: <code>[070-123 45 67](tel:0701234567)</code>.
                Skriv koder som text – inte i bilder (bilder kan nås av den som har länken).
              </p>
            </div>
            <Button onClick={save} disabled={pending} className="gap-1.5">
              <Save className="h-4 w-4" /> Spara guide
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
