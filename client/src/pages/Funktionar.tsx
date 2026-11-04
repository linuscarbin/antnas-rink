import { useAuth } from "@/_core/hooks/useAuth";
import ExpenseSection from "@/components/ExpenseSection";
import RefuelSection from "@/components/RefuelSection";
import SiteLayout from "@/components/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronDown, Pencil, Plus, ShieldCheck } from "lucide-react";
import GuideBody from "@/components/GuideBody";
import JobsBoard from "@/components/JobsBoard";
import GuideEditor, { GUIDE_AREA_LABEL, type GuideArea, type GuideDraft } from "@/components/GuideEditor";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";

type Area = "hockeyrink" | "skidspar";

const AREA_LABEL: Record<Area, string> = {
  hockeyrink: "Hockeyrink",
  skidspar: "Skidspår",
};

/**
 * Functionary page: refuelings, receipts and other expenses.
 * Only visible to admins and to people on plog-/spol-/spårjour.
 */
export default function Funktionar() {
  const { loading, isAuthenticated, isRinkFunctionary, isTrackFunctionary, isAdmin } = useAuth();
  const areas: Area[] = [
    ...(isRinkFunctionary ? (["hockeyrink"] as const) : []),
    ...(isTrackFunctionary ? (["skidspar"] as const) : []),
  ];
  const [area, setArea] = useState<Area | null>(null);
  const guidesQuery = trpc.guides.list.useQuery(undefined, {
    enabled: isRinkFunctionary || isTrackFunctionary,
  });
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<GuideDraft | null>(null);
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
    ? ["publik", "alla", "hockeyrink", "skidspar"]
    : [
        "alla",
        ...(isRinkFunctionary ? (["hockeyrink"] as const) : []),
        ...(isTrackFunctionary ? (["skidspar"] as const) : []),
        "publik",
      ];
  function saveGuide(d: GuideDraft) {
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
        onSave={saveGuide}
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
  useEffect(() => {
    if (!area && areas.length) setArea(areas[0]);
  }, [area, areas]);

  return (
    <SiteLayout>
      <section className="border-b border-border/60">
        <div className="container py-8 sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> För jourhavare
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Funktionär
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Planera jobb, guider, tankning och kvitton. Syns bara för dig som är
            med i ett rinkjourlag eller spårjouren (och för admin).
          </p>
        </div>
      </section>

      {loading ? (
        <div className="container py-8">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : !isAuthenticated ? (
        <div className="container py-8">
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground">
            Logga in för att se funktionärssidan.{" "}
            <button
              className="font-semibold text-primary underline"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              Logga in
            </button>
          </div>
        </div>
      ) : areas.length === 0 ? (
        <div className="container py-8">
          <div className="iso-card p-6 text-sm text-muted-foreground max-w-xl">
            Du är inte inlagd i någon jour än. Be en admin koppla ditt konto
            till ett rinkjourlag eller spårjouren, så dyker
            funktionärsverktygen upp här.
          </div>
        </div>
      ) : (
        <>
          <div className="container pt-6">
            <JobsBoard />
          </div>

          <div className="container pt-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                <BookOpen className="h-5 w-5 text-primary" /> Guider & tips
              </h2>
              {!editing && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    setEditing({ title: "", area: "alla", body: "", sortOrder: (guidesQuery.data ?? []).length })
                  }
                >
                  <Plus className="h-4 w-4" /> Ny guide eller tips
                </Button>
              )}
            </div>
            {editing && !editing.id && <div className="mt-3">{editor}</div>}
            {guidesQuery.isLoading ? (
              <Skeleton className="mt-3 h-20 rounded-2xl" />
            ) : (guidesQuery.data ?? []).length === 0 ? (
              !editing && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Inga guider ännu. Skriv den första – t.ex. hur man kopplar plogen eller var man fyller vatten.
                </p>
              )
            ) : (
              <div className="mt-3 grid gap-2">
                {(guidesQuery.data ?? []).map((g) =>
                  editing?.id === g.id ? (
                    <div key={g.id}>{editor}</div>
                  ) : (
                    <details key={g.id} className="iso-card group p-0">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 font-bold">
                        <span className="min-w-0">
                          {g.title}
                          {g.area === "publik" && (
                            <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                              Publik
                            </span>
                          )}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="px-5 pb-5">
                        <GuideBody body={g.body} />
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
                      </div>
                    </details>
                  )
                )}
              </div>
            )}
          </div>

          {areas.length > 1 && (
            <div className="container pt-6">
              <div className="inline-flex rounded-xl border border-border bg-card p-1">
                {areas.map((a) => (
                  <button
                    key={a}
                    onClick={() => setArea(a)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                      area === a
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {AREA_LABEL[a]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {area && (
            <div key={area}>
              <RefuelSection area={area} />
              <ExpenseSection area={area} />
            </div>
          )}
        </>
      )}
    </SiteLayout>
  );
}
