import PhotoPicker from "@/components/PhotoPicker";
import { SponsorLogo, type SponsorRow } from "@/components/Sponsors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { EyeOff, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Draft = {
  id?: number;
  name: string;
  logoUrl: string;
  text: string;
  url: string;
  tier: "huvud" | "sponsor";
  area: "alla" | "hockeyrink" | "skidspar";
  active: boolean;
  sortOrder: number;
};

const AREA_LABEL = { alla: "Båda", hockeyrink: "Rinken", skidspar: "Skidspåret" } as const;

function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
            value === o.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SponsorForm({
  draft,
  saving,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: Draft;
  saving: boolean;
  onSave: (d: Draft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  return (
    <div className="iso-card grid gap-4 p-5">
      <h3 className="font-extrabold">{d.id ? "Ändra sponsor" : "Ny sponsor"}</h3>
      <div className="grid gap-1.5">
        <Label htmlFor="sp-name">Namn</Label>
        <Input id="sp-name" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="T.ex. Antnäs Bygg AB" />
      </div>
      <div className="grid gap-1.5">
        <Label>Logga</Label>
        <PhotoPicker value={d.logoUrl || null} label="Ladda upp logga" onChange={(u) => set("logoUrl", u ?? "")} />
        <p className="text-xs text-muted-foreground">Helst en logga med vit eller genomskinlig bakgrund.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sp-text">Kort text (valfritt)</Label>
        <Textarea
          id="sp-text"
          rows={2}
          maxLength={300}
          value={d.text}
          onChange={(e) => set("text", e.target.value)}
          placeholder="T.ex. Står för belysningen på rinken"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sp-url">Länk till hemsida (valfritt)</Label>
        <Input
          id="sp-url"
          inputMode="url"
          value={d.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="www.exempel.se"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Typ</Label>
        <Chips
          value={d.tier}
          onChange={(v) => set("tier", v)}
          options={[
            { id: "huvud", label: "Huvudsponsor" },
            { id: "sponsor", label: "Sponsor" },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {d.tier === "huvud"
            ? "Visas stort på översikten och i sponsorraden längst ner på varje sida."
            : "Visas i sponsorraden längst ner på varje sida och på sidan Sponsorer."}
        </p>
      </div>
      {d.tier === "huvud" && (
        <div className="grid gap-1.5">
          <Label>Visas stort på</Label>
          <Chips
            value={d.area}
            onChange={(v) => set("area", v)}
            options={(["alla", "hockeyrink", "skidspar"] as const).map((id) => ({ id, label: AREA_LABEL[id] }))}
          />
        </div>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="sp-order">Ordning</Label>
          <Input
            id="sp-order"
            type="number"
            min={0}
            className="w-24"
            value={d.sortOrder}
            onChange={(e) => set("sortOrder", Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold">
          <Switch checked={d.active} onCheckedChange={(v) => set("active", v)} /> Synlig
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={saving || !d.name.trim()} onClick={() => onSave(d)}>
          Spara
        </Button>
        <Button variant="outline" className="bg-card" onClick={onCancel}>
          Avbryt
        </Button>
        {onDelete && (
          <Button variant="ghost" className="ml-auto text-destructive" onClick={onDelete}>
            Ta bort
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminSponsors() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.sponsors.adminList.useQuery();
  const [editing, setEditing] = useState<Draft | null>(null);

  const done = (msg: string) => {
    utils.sponsors.adminList.invalidate();
    utils.sponsors.list.invalidate();
    setEditing(null);
    toast.success(msg);
  };
  const onError = (e: { message: string }) => toast.error(e.message);
  const create = trpc.sponsors.create.useMutation({ onSuccess: () => done("Sponsorn är tillagd."), onError });
  const update = trpc.sponsors.update.useMutation({ onSuccess: () => done("Sponsorn är uppdaterad."), onError });
  const del = trpc.sponsors.delete.useMutation({ onSuccess: () => done("Sponsorn är borttagen."), onError });

  function save(d: Draft) {
    const { id, ...data } = d;
    if (id) update.mutate({ id, ...data });
    else create.mutate(data);
  }

  const rows = (data ?? []) as (SponsorRow & { active: boolean; sortOrder: number })[];

  const form = editing && (
    <SponsorForm
      key={editing.id ?? "new"}
      draft={editing}
      saving={create.isPending || update.isPending}
      onSave={save}
      onCancel={() => setEditing(null)}
      onDelete={
        editing.id
          ? () => {
              if (confirm(`Ta bort ${editing.name}?`)) del.mutate({ id: editing.id! });
            }
          : undefined
      }
    />
  );

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Sponsorer visas i en rad längst ner på alla sidor och på sidan Sponsorer. Huvudsponsorer visas även stort
          på Rinkens och Skidspårets översikt.
        </p>
        {!editing && (
          <Button
            className="gap-1"
            onClick={() =>
              setEditing({
                name: "",
                logoUrl: "",
                text: "",
                url: "",
                tier: "sponsor",
                area: "alla",
                active: true,
                sortOrder: rows.length,
              })
            }
          >
            <Plus className="h-4 w-4" /> Ny sponsor
          </Button>
        )}
      </div>

      {editing && !editing.id && form}

      {isLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Inga sponsorer ännu.</p>
      ) : (
        <div className="grid gap-2">
          {rows.map((s) =>
            editing?.id === s.id ? (
              <div key={s.id}>{form}</div>
            ) : (
              <div key={s.id} className={`iso-card flex items-center gap-3 p-3 ${s.active ? "" : "opacity-60"}`}>
                <span className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-white p-1.5 ring-1 ring-border">
                  <SponsorLogo s={s} className="max-h-11" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="truncate">{s.name}</span>
                    {s.tier === "huvud" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                        Huvudsponsor · {AREA_LABEL[s.area]}
                      </span>
                    )}
                    {!s.active && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <EyeOff className="h-3 w-3" /> Dold
                      </span>
                    )}
                  </div>
                  {s.text && <div className="truncate text-sm text-muted-foreground">{s.text}</div>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 gap-1"
                  onClick={() =>
                    setEditing({
                      id: s.id,
                      name: s.name,
                      logoUrl: s.logoUrl ?? "",
                      text: s.text ?? "",
                      url: s.url ?? "",
                      tier: s.tier,
                      area: s.area,
                      active: s.active,
                      sortOrder: s.sortOrder,
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" /> Ändra
                </Button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
