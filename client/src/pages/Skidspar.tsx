import { useAuth } from "@/_core/hooks/useAuth";
import IsoDecor from "@/components/IsoDecor";
import SiteLayout from "@/components/SiteLayout";
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
import { getLoginUrl } from "@/const";
import { timeAgo } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { getIsoWeek } from "@shared/rink";
import { AlertTriangle, Phone, Snowflake, Trees, Undo2 } from "lucide-react";
import { Leaderboard } from "./Home";
import RefuelSection from "@/components/RefuelSection";
import ExpenseSection from "@/components/ExpenseSection";
import { useState } from "react";
import { toast } from "sonner";

const CONDITIONS = ["Mycket bra", "Bra", "Hyfsat", "Dåligt", "Ej åkbart"] as const;

const CONDITION_COLOR: Record<string, string> = {
  "Mycket bra": "oklch(0.72 0.13 184)",
  Bra: "oklch(0.7 0.15 150)",
  Hyfsat: "oklch(0.78 0.14 90)",
  Dåligt: "oklch(0.7 0.18 25)",
  "Ej åkbart": "oklch(0.55 0.16 25)",
};

export default function Skidspar() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const statusQuery = trpc.track.get.useQuery();
  const [now] = useState(() => new Date());
  const current = getIsoWeek(now);
  const [year, setYear] = useState(current.year);
  const dutyQuery = trpc.skiDuty.list.useQuery({ year });

  const [helpers, setHelpers] = useState("");
  const leaderboardQuery = trpc.track.leaderboard.useQuery();
  const invalidateTrack = () => {
    utils.track.get.invalidate();
    utils.track.leaderboard.invalidate();
  };
  const markDraget = trpc.track.markDraget.useMutation({
    onSuccess: () => {
      invalidateTrack();
      setHelpers("");
      toast.success("Status uppdaterad: draget");
    },
    onError: (e) => toast.error(e.message),
  });
  const undo = trpc.track.undo.useMutation({
    onSuccess: () => {
      invalidateTrack();
      toast.success("Ångrade senaste markeringen.");
    },
    onError: (e) => toast.error(e.message),
  });
  const setCondition = trpc.track.setCondition.useMutation({
    onSuccess: () => {
      utils.track.get.invalidate();
      toast.success("Spårskick uppdaterat");
    },
    onError: (e) => toast.error(e.message),
  });
  const flag = trpc.skiDuty.flagConflict.useMutation({
    onSuccess: () => {
      utils.skiDuty.list.invalidate();
      toast.success("Förhinder anmält. Admin har meddelats.");
    },
    onError: (e) => toast.error(e.message),
  });

  const status = statusQuery.data;
  const dragetFresh = status?.dragetAt
    ? Date.now() - new Date(status.dragetAt).getTime() < 48 * 3600 * 1000
    : false;
  const condColor = status?.condition
    ? CONDITION_COLOR[status.condition]
    : "oklch(0.6 0.02 250)";

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border/60">
        <IsoDecor />
        <div className="container relative py-10 sm:py-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Trees className="h-3.5 w-3.5" /> Antnäs skidspår
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
              Hur är <span className="text-primary">spåret</span> idag?
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Se när längdspåret senast drogs, aktuellt spårskick och vem som har
              spårjour.
            </p>
          </div>
        </div>
      </section>

      <div className="container py-8 grid gap-6 lg:grid-cols-3">
        {/* Status */}
        <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
          {statusQuery.isLoading ? (
            <>
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </>
          ) : (
            <>
              {/* Draget card */}
              <div className="iso-card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-xl"
                    style={{
                      background: "oklch(0.72 0.13 184 / 0.1)",
                      color: "oklch(0.72 0.13 184)",
                    }}
                  >
                    <Snowflake className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-xl font-extrabold leading-tight">Draget</h3>
                    <span
                      className="inline-flex items-center gap-1.5 text-sm font-semibold"
                      style={{
                        color: dragetFresh
                          ? "oklch(0.72 0.13 184)"
                          : "var(--muted-foreground)",
                      }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: dragetFresh
                            ? "oklch(0.72 0.13 184)"
                            : "oklch(0.75 0.16 75)",
                        }}
                      />
                      {dragetFresh
                        ? "Draget nyligen"
                        : status?.dragetAt
                          ? "Kan behöva dras"
                          : "Ej draget"}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {status?.dragetAt ? (
                    <>
                      Senast draget{" "}
                      <strong className="text-foreground">
                        {timeAgo(status.dragetAt)}
                      </strong>
                      {status.dragetBy ? (
                        <>
                          {" "}av{" "}
                          <strong className="text-foreground">
                            {status.dragetBy}
                          </strong>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>Ingen registrering ännu.</>
                  )}
                </div>
                {isAuthenticated && (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={helpers}
                      onChange={(e) => setHelpers(e.target.value)}
                      placeholder="Medhjälpare (valfritt, komma-separera)"
                      className="bg-card text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => markDraget.mutate({ helpers })}
                        disabled={markDraget.isPending}
                        variant="outline"
                        className="bg-card font-semibold flex-1"
                      >
                        Markera som draget nu
                      </Button>
                      {status?.dragetAt && (
                        <Button
                          onClick={() => undo.mutate()}
                          disabled={undo.isPending}
                          variant="ghost"
                          size="icon"
                          aria-label="Ångra"
                          title="Ångra senaste"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Condition card */}
              <div className="iso-card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-xl"
                    style={{ background: `${condColor} / 0.12`, color: condColor }}
                  >
                    <Trees className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-xl font-extrabold leading-tight">
                      Spårskick
                    </h3>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: condColor }}
                    >
                      {status?.condition ?? "Ej bedömt"}
                    </span>
                  </div>
                </div>
                {isAuthenticated ? (
                  <Select
                    value={status?.condition ?? undefined}
                    onValueChange={(v) =>
                      setCondition.mutate({ condition: v as (typeof CONDITIONS)[number] })
                    }
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Sätt spårskick" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Inloggade kan uppdatera spårskick.
                  </p>
                )}
              </div>

              {status?.note && (
                <div className="sm:col-span-2 iso-card p-4 text-sm">
                  <strong>Notering:</strong> {status.note}
                </div>
              )}

              {!isAuthenticated && (
                <div className="sm:col-span-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground">
                  Logga in för att uppdatera spårstatus.{" "}
                  <button
                    className="font-semibold text-primary underline"
                    onClick={() => (window.location.href = getLoginUrl())}
                  >
                    Logga in
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* This week's ski duty */}
        <div className="grid gap-6 content-start">
          <div className="iso-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Vecka {current.week} · Spårjour
              </div>
            </div>
            {dutyQuery.isLoading ? (
              <Skeleton className="mt-3 h-16" />
            ) : (
              (() => {
                const d = dutyQuery.data?.find((x) => x.week === current.week);
                if (!d)
                  return (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Ingen spårjour inlagd för denna vecka.
                    </p>
                  );
                return (
                  <div className="mt-3">
                    <div className="font-semibold">
                      {d.sparjourName || "—"}
                      {d.sparjourConflict && (
                        <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">
                          Förhinder
                        </span>
                      )}
                    </div>
                    {d.sparjourPhone && (
                      <a
                        href={`tel:${d.sparjourPhone}`}
                        className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                      >
                        <Phone className="h-3.5 w-3.5" /> {d.sparjourPhone}
                      </a>
                    )}
                  </div>
                );
              })()
            )}
          </div>

          <Leaderboard
            title="Insatser i säsong"
            subtitle="Spårdragningar"
            data={leaderboardQuery.data}
            loading={leaderboardQuery.isLoading}
          />
        </div>
      </div>

      <RefuelSection area="skidspar" />
      <ExpenseSection area="skidspar" />

      {/* Ski duty schedule */}
      <div className="container pb-12">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h2 className="text-2xl font-extrabold tracking-tight">Spårjour-schema</h2>
          <div className="flex items-center gap-2">
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
        </div>

        <div className="mt-4 grid gap-3">
          {dutyQuery.isLoading ? (
            <Skeleton className="h-20 rounded-2xl" />
          ) : dutyQuery.data && dutyQuery.data.length > 0 ? (
            dutyQuery.data.map((d) => {
              const isCurrent = year === current.year && d.week === current.week;
              const mine = user && d.sparjourUserId === user.id;
              return (
                <div
                  key={d.id}
                  className={`iso-card p-5 flex items-center gap-4 ${
                    isCurrent ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary font-extrabold shrink-0">
                    v{d.week}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">
                      {d.sparjourName || "—"}
                      {d.sparjourConflict && (
                        <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">
                          Förhinder
                        </span>
                      )}
                    </div>
                    {d.sparjourPhone && (
                      <a
                        href={`tel:${d.sparjourPhone}`}
                        className="text-sm font-semibold text-primary inline-flex items-center gap-1"
                      >
                        <Phone className="h-3.5 w-3.5" /> {d.sparjourPhone}
                      </a>
                    )}
                  </div>
                  {mine && (
                    <Button
                      variant={d.sparjourConflict ? "outline" : "ghost"}
                      size="sm"
                      className="gap-1.5 bg-card shrink-0"
                      onClick={() =>
                        flag.mutate({
                          id: d.id,
                          conflict: !d.sparjourConflict,
                        })
                      }
                      disabled={flag.isPending}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {d.sparjourConflict ? "Ta bort" : "Förhinder"}
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="iso-card p-8 text-center text-muted-foreground">
              Inget spårjour-schema för {year} ännu.
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
