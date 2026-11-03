import GuideEditor, { GUIDE_AREA_LABEL, type GuideArea, type GuideDraft } from "@/components/GuideEditor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Area = GuideArea;

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
    body: "## Var ska snön?\n\nLägg snön **här**: \n\nInte här: \n\nAnnars blir det svårt för rinkjouren nästa gång.\n",
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

const ALL_AREAS: Area[] = ["publik", "alla", "hockeyrink", "skidspar"];

export default function AdminGuides() {
  const utils = trpc.useUtils();
  const listQuery = trpc.guides.adminList.useQuery();
  const [draft, setDraft] = useState<GuideDraft | null>(null);

  const done = (msg: string) => {
    utils.guides.adminList.invalidate();
    utils.guides.list.invalidate();
    utils.guides.publicList.invalidate();
    setDraft(null);
    toast.success(msg);
  };
  const onError = (e: { message: string }) => toast.error(e.message);
  const create = trpc.guides.create.useMutation({ onSuccess: () => done("Guiden är sparad."), onError });
  const update = trpc.guides.update.useMutation({ onSuccess: () => done("Guiden är uppdaterad."), onError });
  const remove = trpc.guides.delete.useMutation({ onSuccess: () => done("Guiden är borttagen."), onError });

  function save(d: GuideDraft) {
    const data = { title: d.title, area: d.area, body: d.body, sortOrder: d.sortOrder };
    if (d.id) update.mutate({ id: d.id, ...data });
    else create.mutate(data);
  }

  const guides = listQuery.data ?? [];
  const unusedTemplates = TEMPLATES.filter((t) => !guides.some((g) => g.title === t.title));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="iso-card p-6 h-fit">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Guider & tips</h2>
          <Button
            size="sm"
            onClick={() => setDraft({ title: "", area: "alla", body: "", sortOrder: guides.length })}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Ny guide
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Jourhavare kan också skriva egna guider och tips under Funktionär. Här
          kan du ändra eller ta bort alla.
        </p>

        {listQuery.isLoading ? (
          <Skeleton className="mt-4 h-24" />
        ) : guides.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Inga guider ännu. Börja från en mall nedan.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {guides.map((g) => (
              <li key={g.id}>
                <button
                  className="flex w-full items-center gap-2 py-2.5 text-left hover:bg-accent/40"
                  onClick={() =>
                    setDraft({ id: g.id, title: g.title, area: g.area, body: g.body, sortOrder: g.sortOrder })
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{g.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {GUIDE_AREA_LABEL[g.area]}
                      {g.updatedByName ? ` · ${g.updatedByName}` : ""}
                    </div>
                  </div>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {unusedTemplates.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground">Mallar:</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {unusedTemplates.map((t) => (
                <Button
                  key={t.title}
                  size="sm"
                  variant="outline"
                  className="h-7 bg-card text-xs"
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
        <div className="iso-card p-6 h-fit">
          <h3 className="mb-3 font-extrabold">{draft.id ? "Redigera guide" : "Ny guide"}</h3>
          <GuideEditor
            key={draft.id ?? `new-${draft.title}`}
            draft={draft}
            areas={ALL_AREAS}
            saving={create.isPending || update.isPending}
            onSave={save}
            onCancel={() => setDraft(null)}
            onDelete={
              draft.id
                ? () => {
                    if (confirm(`Ta bort "${draft.title}"?`)) remove.mutate({ id: draft.id! });
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
