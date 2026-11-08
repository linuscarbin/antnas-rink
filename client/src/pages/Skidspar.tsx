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
import TeamChat from "@/components/TeamChat";
import { SponsorSpotlight } from "@/components/Sponsors";
import { EventCard } from "@/components/EventsBoard";
import { getIsoWeek } from "@shared/rink";
import { BookOpen, Receipt, Snowflake, Trees, Undo2, Users } from "lucide-react";
import HubTabs, { useHubTab } from "@/components/HubTabs";
import JobsBoard from "@/components/JobsBoard";
import RefuelSection from "@/components/RefuelSection";
import ExpenseSection from "@/components/ExpenseSection";
import { Leaderboard } from "./Home";
import RulesButton from "@/components/RulesButton";
import VerdictCard from "@/components/VerdictCard";
import PhotoPicker from "@/components/PhotoPicker";
import DutyWeeks, { ThisWeekDuty } from "@/components/DutyWeeks";
import { trackVerdict } from "@shared/verdict";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";

// Guides pull in the markdown renderer – only load it on the Info tab.
const GuidesSection = lazy(() => import("@/components/GuidesSection"));

const CONDITIONS = ["Mycket bra", "Bra", "Hyfsat", "Dåligt", "Ej åkbart"] as const;

const CONDITION_COLOR: Record<string, string> = {
  "Mycket bra": "oklch(0.72 0.13 184)",
  Bra: "oklch(0.7 0.15 150)",
  Hyfsat: "oklch(0.78 0.14 90)",
  Dåligt: "oklch(0.7 0.18 25)",
  "Ej åkbart": "oklch(0.55 0.16 25)",
};

export default function Skidspar() {
  const { isAuthenticated, isTrackFunctionary } = useAuth();
  const tabs = [
    { id: "oversikt" as const, label: "Översikt", icon: Trees },
    { id: "jour" as const, label: "Jour", icon: Users },
    { id: "info" as const, label: "Info", icon: BookOpen },
    ...(isTrackFunctionary ? [{ id: "kostnader" as const, label: "Kostnader", icon: Receipt }] : []),
  ];
  const [tab, setTab] = useHubTab(tabs, "oversikt");
  const utils = trpc.useUtils();
  // Same refresh rate as the rink status.
  const statusQuery = trpc.track.get.useQuery(undefined, { refetchInterval: 2 * 60 * 1000 });
  const eventsQuery = trpc.events.list.useQuery(undefined, { refetchInterval: 5 * 60 * 1000 });
  const nextEvent = eventsQuery.data?.find(
    // Upcoming or ongoing only – the list also keeps work days that just ended.
    (e) => e.area !== "hockeyrink" && new Date(e.endsAt).getTime() > Date.now()
  );
  const [now] = useState(() => new Date());

  const [helpers, setHelpers] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const leaderboardQuery = trpc.track.leaderboard.useQuery();
  const invalidateTrack = () => {
    utils.track.get.invalidate();
    utils.track.leaderboard.invalidate();
    // Marking by hand also completes planned jobs (Planera jobb + lagchatt).
    utils.jobs.list.invalidate();
    utils.teamChat.list.invalidate();
  };
  const markDraget = trpc.track.markDraget.useMutation({
    onSuccess: () => {
      invalidateTrack();
      setHelpers("");
      setPhotoUrl(null);
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

  const status = statusQuery.data;
  const dragetFresh = status?.dragetAt
    ? Date.now() - new Date(status.dragetAt).getTime() < 48 * 3600 * 1000
    : false;
  const condColor = status?.condition
    ? CONDITION_COLOR[status.condition]
    : "oklch(0.6 0.02 250)";

  return (
    <SiteLayout>
      <HubTabs title="Skidspåret" tabs={tabs} value={tab} onChange={setTab} />

      {tab === "jour" && (
        <div className="container grid gap-10 py-6">
          {isTrackFunctionary && <TeamChat area="skidspar" />}
          <section>
            <h2 className="mb-3 text-xl font-extrabold tracking-tight">Spårjour</h2>
            <DutyWeeks area="skidspar" />
          </section>
          {isTrackFunctionary && <JobsBoard area="skidspar" />}
        </div>
      )}

      {tab === "info" && (
        <Suspense fallback={<div className="container py-6"><div className="h-24 animate-pulse rounded-2xl bg-muted" /></div>}>
          <GuidesSection area="skidspar" />
        </Suspense>
      )}

      {tab === "kostnader" && isTrackFunctionary && (
        <div className="pt-6">
          <RefuelSection area="skidspar" />
          <ExpenseSection area="skidspar" />
        </div>
      )}

      {tab === "oversikt" && (
      <>
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
            <div className="mt-4">
              <RulesButton area="skidspar" />
            </div>
          </div>
          <div className="mt-6 grid max-w-4xl items-start gap-4 sm:grid-cols-2">
            <VerdictCard
              label="Skidspåret"
              loading={statusQuery.isLoading}
              verdict={
                statusQuery.isLoading
                  ? null
                  : trackVerdict({
                      condition: status?.condition,
                      dragetAt: status?.dragetAt,
                    })
              }
              meta={status?.dragetAt ? `Draget ${timeAgo(status.dragetAt)}` : undefined}
              photo={
                status?.photoUrl
                  ? {
                      url: status.photoUrl,
                      caption: `Foto ${timeAgo(status.photoAt)}${status.photoBy ? ` · ${status.photoBy}` : ""}`,
                    }
                  : null
              }
            />
            {/* Skötseln först: veckans spårjour bredvid statusen. */}
            <ThisWeekDuty area="skidspar" href="/skidspar?flik=jour" />
              {nextEvent && (
              <div className="sm:col-span-2">
                <EventCard e={nextEvent} compact />
              </div>
            )}
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
                {isTrackFunctionary && (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={helpers}
                      onChange={(e) => setHelpers(e.target.value)}
                      placeholder="Medhjälpare (valfritt, komma-separera)"
                      className="bg-card text-sm"
                    />
                    <PhotoPicker value={photoUrl} onChange={setPhotoUrl} />
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          markDraget.mutate({ helpers, photoUrl: photoUrl ?? undefined })
                        }
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
                {isTrackFunctionary ? (
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
                    Spårskicket uppdateras av de som har spårjour.
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
                  Har du spårjour? Logga in för att uppdatera spårstatus.{" "}
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

          <Leaderboard
            title="Insatser i säsong"
            subtitle="Spårdragningar"
            data={leaderboardQuery.data}
            loading={leaderboardQuery.isLoading}
          />
        </div>
      </div>


      {/* Sponsors after the duty tools, so functionaries reach those first. */}
      <SponsorSpotlight area="skidspar" />
      <div className="pb-8" />
      </>
      )}
    </SiteLayout>
  );
}
