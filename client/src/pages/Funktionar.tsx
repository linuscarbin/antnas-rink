import { useAuth } from "@/_core/hooks/useAuth";
import ExpenseSection from "@/components/ExpenseSection";
import RefuelSection from "@/components/RefuelSection";
import SiteLayout from "@/components/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronDown, ShieldCheck } from "lucide-react";
import { Streamdown } from "streamdown";
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
  const { loading, isAuthenticated, isRinkFunctionary, isTrackFunctionary } = useAuth();
  const areas: Area[] = [
    ...(isRinkFunctionary ? (["hockeyrink"] as const) : []),
    ...(isTrackFunctionary ? (["skidspar"] as const) : []),
  ];
  const [area, setArea] = useState<Area | null>(null);
  const guidesQuery = trpc.guides.list.useQuery(undefined, {
    enabled: isRinkFunctionary || isTrackFunctionary,
  });
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
            Guider, tankning, kvitton och utlägg. Syns bara för dig som är
            inlagd i plog-, spol- eller spårjouren (och för admin).
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
            till plog-, spol- eller spårjouren i schemat, så dyker
            funktionärsverktygen upp här.
          </div>
        </div>
      ) : (
        <>
          <div className="container pt-6">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <BookOpen className="h-5 w-5 text-primary" /> Guider
            </h2>
            {guidesQuery.isLoading ? (
              <Skeleton className="mt-3 h-20 rounded-2xl" />
            ) : (guidesQuery.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Inga guider ännu. Admin kan lägga till dem under Admin → Guider.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {(guidesQuery.data ?? []).map((g) => (
                  <details key={g.id} className="iso-card group p-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 font-bold">
                      {g.title}
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="prose prose-sm max-w-none px-5 pb-5">
                      <Streamdown>{g.body}</Streamdown>
                    </div>
                  </details>
                ))}
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
