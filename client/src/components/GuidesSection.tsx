import { useAuth } from "@/_core/hooks/useAuth";
import GuideBody from "@/components/GuideBody";
import GuideEditor, { GUIDE_AREA_LABEL, type GuideArea, type GuideDraft } from "@/components/GuideEditor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronDown, Lock, Pencil, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Area = "hockeyrink" | "skidspar";

type GuideRow = {
  id: number;
  title: string;
  area: GuideArea;
  body: string;
  sortOrder: number;
  updatedByName: string | null;
  canEdit?: boolean;
};

/**
 * "Info" tab of a hub: public rules & tips for everyone; for the area's
 * functionaries also the duty guides (förrådskod etc.) and a way to add tips.
 */
export default function GuidesSection({ area }: { area: Area }) {
  const { isRinkFunctionary, isTrackFunctionary, isAdmin } = useAuth();
  const isFunctionary = area === "hockeyrink" ? isRinkFunctionary : isTrackFunctionary;
  const anyFunctionary = isRinkFunctionary || isTrackFunctionary;
  const dutyQuery = trpc.guides.list.useQuery(undefined, { enabled: anyFunctionary });
  const publicQuery = trpc.guides.publicList.useQuery(undefined, { enabled: !anyFunctionary });
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<GuideDraft | null>(null);

  const all = ((anyFunctionary ? dutyQuery.data : publicQuery.data) ?? []) as GuideRow[];
  // Public tips are shown in both hubs; duty guides only in their own area.
  const publicGuides = all.filter((g) => g.area === "publik");
  const dutyGuides = isFunctionary ? all.filter((g) => g.area === "alla" || g.area === area) : [];
  // Codes and keys: only admins get these from the server at all.
  const adminGuides = isAdmin ? all.filter((g) => g.area === "admin") : [];
  const loading = anyFunctionary ? dutyQuery.isLoading : publicQuery.isLoading;

  const done = (msg: string) => {
    utils.guides.list.invalidate();
    utils.guides.publicList.invalidate();
    setEditing(null);
    toast.success(msg);
  };
  const onError = (e: { message: string }) => toast.error(e.message);
  const createGuide = trpc.guides.create.useMutation({ onSuccess: () => done("Tack! Guiden är publicerad."), onError });
  const updateGuide = trpc.guides.update.useMutation({ onSuccess: () => done("Guiden är uppdaterad."), onError });
  const deleteGuide = trpc.guides.delete.useMutation({ onSuccess: () => done("Guiden är borttagen."), onError });

  const writableAreas: GuideArea[] = isAdmin
    ? [area, "alla", "publik", area === "hockeyrink" ? "skidspar" : "hockeyrink", "admin"]
    : [area, "alla", "publik"];

  function save(d: GuideDraft) {
    const data = { title: d.title, area: d.area, body: d.body, sortOrder: d.sortOrder };
    if (d.id) updateGuide.mutate({ id: d.id, ...data });
    else createGuide.mutate(data);
  }

  const editor = editing && (
    <div className="iso-card p-5">
      <h3 className="mb-3 font-extrabold">{editing.id ? "Ändra guide" : "Ny guide eller tips"}</h3>
      <GuideEditor
        key={editing.id ?? "new"}
        draft={editing}
        areas={writableAreas}
        saving={createGuide.isPending || updateGuide.isPending}
        onSave={save}
        onCancel={() => setEditing(null)}
        onDelete={
          editing.id
            ? () => {
                if (confirm(`Ta bort "${editing.title}"?`)) deleteGuide.mutate({ id: editing.id! });
              }
            : undefined
        }
      />
    </div>
  );

  const list = (guides: GuideRow[]) => (
    <div className="grid gap-2">
      {guides.map((g, i) =>
        editing?.id === g.id ? (
          <div key={g.id}>{editor}</div>
        ) : (
          <details key={g.id} className="iso-card group p-0" open={guides.length === 1 || (i === 0 && !isFunctionary)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 font-bold">
              {g.title}
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5">
              <GuideBody body={g.body} />
              {(g.canEdit || isFunctionary) && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    {GUIDE_AREA_LABEL[g.area]}
                    {g.updatedByName ? ` · ${g.updatedByName}` : ""}
                  </span>
                  {g.canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-xs"
                      onClick={() =>
                        setEditing({ id: g.id, title: g.title, area: g.area, body: g.body, sortOrder: g.sortOrder })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" /> Ändra
                    </Button>
                  )}
                </div>
              )}
            </div>
          </details>
        )
      )}
    </div>
  );

  return (
    <div className="container grid max-w-3xl gap-8 py-6">
      {isAdmin && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
              <ShieldCheck className="h-5 w-5 text-primary" /> Bara admin
            </h2>
            {!editing && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 bg-card"
                onClick={() => setEditing({ title: "", area: "admin", body: "", sortOrder: all.length })}
              >
                <Plus className="h-4 w-4" /> Ny admin-guide
              </Button>
            )}
          </div>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">
            Syns bara för admin – t.ex. koder och var nycklarna finns. Ge vidare till jouren vid behov.
          </p>
          {editing && !editing.id && editing.area === "admin" && <div className="mb-3">{editor}</div>}
          {loading ? (
            <Skeleton className="h-16 rounded-2xl" />
          ) : adminGuides.length ? (
            list(adminGuides)
          ) : (
            <p className="text-sm text-muted-foreground">Inga admin-guider ännu.</p>
          )}
        </section>
      )}

      {isFunctionary && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
              <Lock className="h-5 w-5 text-primary" /> För jouren
            </h2>
            {!editing && (
              <Button
                size="sm"
                className="gap-1"
                onClick={() => setEditing({ title: "", area, body: "", sortOrder: all.length })}
              >
                <Plus className="h-4 w-4" /> Ny guide eller tips
              </Button>
            )}
          </div>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">
            Syns bara för jourhavare – t.ex. hur man kopplar plogen och viktiga kontakter. Koder och nycklar läggs under "Bara admin".
          </p>
          {editing && !editing.id && editing.area !== "admin" && <div className="mb-3">{editor}</div>}
          {loading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : dutyGuides.length ? (
            list(dutyGuides)
          ) : (
            <p className="text-sm text-muted-foreground">Inga guider ännu.</p>
          )}
        </section>
      )}

      <section>
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <BookOpen className="h-5 w-5 text-primary" /> Regler & tips
        </h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Allt sköts ideellt av byborna – hjälp till genom att följa reglerna.
        </p>
        {loading ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : publicGuides.length ? (
          list(publicGuides)
        ) : (
          <p className="text-sm text-muted-foreground">Ingen information upplagd ännu.</p>
        )}
      </section>
    </div>
  );
}
