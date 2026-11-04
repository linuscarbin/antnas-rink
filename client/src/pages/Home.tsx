import { useAuth } from "@/_core/hooks/useAuth";
import IsoDecor from "@/components/IsoDecor";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { timeAgo } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import TeamChat from "@/components/TeamChat";
import { SponsorSpotlight } from "@/components/Sponsors";
import CheckinWidget from "@/components/CheckinWidget";
import VerdictCard from "@/components/VerdictCard";
import PhotoPicker from "@/components/PhotoPicker";
import DutyWeeks, { ThisWeekDuty } from "@/components/DutyWeeks";
import HubTabs, { useHubTab } from "@/components/HubTabs";
import GuidesSection from "@/components/GuidesSection";
import JobsBoard from "@/components/JobsBoard";
import RefuelSection from "@/components/RefuelSection";
import ExpenseSection from "@/components/ExpenseSection";
import { BookingSection } from "@/pages/Boka";
import { EventCard } from "@/components/EventsBoard";
import RulesButton from "@/components/RulesButton";
import { rinkVerdict } from "@shared/verdict";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  CalendarDays,
  Receipt,
  Users,
  Bell,
  CheckCircle2,
  CloudSnow,
  Droplets,
  Phone,
  Snowflake,
  Thermometer,
  Trophy,
  Undo2,
  Wind,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

function StatusCard({
  kind,
  label,
  doneAt,
  doneBy,
  icon,
  canAct,
  onMark,
  onUndo,
  pending,
}: {
  kind: "plogad" | "spolad";
  label: string;
  doneAt: Date | string | null;
  doneBy: string | null;
  icon: React.ReactNode;
  canAct: boolean;
  onMark: (helpers: string, photoUrl: string | null) => void;
  onUndo: () => void;
  pending: boolean;
}) {
  const [helpers, setHelpers] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // "Fresh" if done within last 24h.
  const fresh = doneAt
    ? Date.now() - new Date(doneAt).getTime() < 24 * 3600 * 1000
    : false;

  // plogad = ocean/blue accent, spolad = teal accent
  const accent =
    kind === "plogad"
      ? { ring: "oklch(0.6 0.17 250)", bg: "oklch(0.6 0.17 250 / 0.1)" }
      : { ring: "oklch(0.72 0.13 184)", bg: "oklch(0.72 0.13 184 / 0.1)" };

  return (
    <div className="iso-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-xl"
            style={{ background: accent.bg, color: accent.ring }}
          >
            {icon}
          </span>
          <div>
            <h3 className="text-xl font-extrabold leading-tight">{label}</h3>
            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: fresh ? accent.ring : "var(--muted-foreground)" }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: fresh ? accent.ring : "oklch(0.75 0.16 75)",
                }}
              />
              {fresh ? "Klart nyligen" : doneAt ? "Behöver göras snart" : "Ej gjort"}
            </span>
          </div>
        </div>
        {fresh && (
          <CheckCircle2 className="h-6 w-6" style={{ color: accent.ring }} />
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {doneAt ? (
          <>
            Senast {kind} <strong className="text-foreground">{timeAgo(doneAt)}</strong>
            {doneBy ? (
              <>
                {" "}av <strong className="text-foreground">{doneBy}</strong>
              </>
            ) : null}
          </>
        ) : (
          <>Ingen registrering ännu.</>
        )}
      </div>

      {canAct && (
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
              onClick={() => {
                onMark(helpers, photoUrl);
                setHelpers("");
                setPhotoUrl(null);
              }}
              disabled={pending}
              variant="outline"
              className="bg-card font-semibold flex-1"
            >
              Markera som {kind} nu
            </Button>
            {doneAt && (
              <Button
                onClick={onUndo}
                disabled={pending}
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
  );
}

export default function Home() {
  const { isAuthenticated, isRinkFunctionary } = useAuth();
  const tabs = [
    { id: "oversikt" as const, label: "Översikt", icon: Snowflake },
    { id: "boka" as const, label: "Boka", icon: CalendarDays },
    { id: "jour" as const, label: "Jour", icon: Users },
    { id: "info" as const, label: "Info", icon: BookOpen },
    ...(isRinkFunctionary ? [{ id: "kostnader" as const, label: "Kostnader", icon: Receipt }] : []),
  ];
  const [tab, setTab] = useHubTab(tabs, "oversikt");
  const utils = trpc.useUtils();
  const statusQuery = trpc.status.get.useQuery(undefined, {
    refetchInterval: 2 * 60 * 1000,
  });
  const closedQuery = trpc.settings.getRinkClosed.useQuery();
  const eventsQuery = trpc.events.list.useQuery(undefined, { refetchInterval: 5 * 60 * 1000 });
  // Only work days for the rink (or both); ski-track ones show on /skidspar.
  const nextEvent = eventsQuery.data?.find((e) => e.area !== "skidspar");
  const setPhoto = trpc.status.setPhoto.useMutation({
    onSuccess: () => {
      utils.status.get.invalidate();
      toast.success("Fotot är uppladdat.");
    },
    onError: (e) => toast.error(e.message),
  });
  const [closeMsg, setCloseMsg] = useState("");
  const setClosed = trpc.settings.setRinkClosed.useMutation({
    onSuccess: (r) => {
      utils.settings.getRinkClosed.invalidate();
      setCloseMsg("");
      toast.success(r.message ? "Rinken markerad som stängd." : "Rinken är öppen igen.");
    },
    onError: (e) => toast.error(e.message),
  });
  const weatherQuery = trpc.weather.current.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
  });

  const leaderboardQuery = trpc.status.leaderboard.useQuery();
  const invalidateAll = () => {
    utils.status.get.invalidate();
    utils.status.leaderboard.invalidate();
  };
  const markPlogad = trpc.status.markPlogad.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success("Status uppdaterad: plogad");
    },
    onError: (e) => toast.error(e.message),
  });
  const markSpolad = trpc.status.markSpolad.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success("Status uppdaterad: spolad");
    },
    onError: (e) => toast.error(e.message),
  });
  const undo = trpc.status.undo.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success("Ångrade senaste markeringen.");
    },
    onError: (e) => toast.error(e.message),
  });

  const temp = weatherQuery.data?.temperature;
  const goodForFlooding = typeof temp === "number" && temp <= -4;
  const closedMessage = closedQuery.data?.message ?? "";

  const rink = statusQuery.data;
  const rinkV = statusQuery.isLoading
    ? null
    : rinkVerdict({
        closedMessage,
        plogadAt: rink?.plogadAt,
        spoladAt: rink?.spoladAt,
        temperature: weatherQuery.data?.ok ? temp : null,
      });
  const rinkMeta = [
    rink?.plogadAt ? `Plogad ${timeAgo(rink.plogadAt)}` : null,
    rink?.spoladAt ? `Spolad ${timeAgo(rink.spoladAt)}` : null,
    typeof temp === "number" ? `${Math.round(temp)}° ute` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SiteLayout>
      <HubTabs title="Rinken" tabs={tabs} value={tab} onChange={setTab} />

      {tab === "boka" && <BookingSection />}

      {tab === "jour" && (
        <div className="container grid gap-10 py-6">
          {isRinkFunctionary && <TeamChat area="hockeyrink" />}
          <section>
            <h2 className="mb-3 text-xl font-extrabold tracking-tight">Rinkjour</h2>
            <DutyWeeks area="hockeyrink" />
          </section>
          {isRinkFunctionary && <JobsBoard area="hockeyrink" />}
        </div>
      )}

      {tab === "info" && <GuidesSection area="hockeyrink" />}

      {tab === "kostnader" && isRinkFunctionary && (
        <div className="pt-6">
          <RefuelSection area="hockeyrink" />
          <ExpenseSection area="hockeyrink" />
        </div>
      )}

      {tab === "oversikt" && (
      <>
      {/* Hero: the big answer */}
      <section className="relative overflow-hidden border-b border-border/60">
        <IsoDecor />
        <div className="container relative py-8 sm:py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Snowflake className="h-3.5 w-3.5" /> Antnäs Vinter
          </span>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
            Är isen <span className="text-primary">åkbar</span> ikväll?
          </h1>
          <div className="mt-4">
            <RulesButton area="hockeyrink" />
          </div>
          <div className="mt-6 grid gap-4 max-w-4xl sm:grid-cols-2 items-start">
            <VerdictCard
              label="Hockeyrinken"
              verdict={rinkV}
              meta={rinkMeta || undefined}
              photo={
                rink?.photoUrl
                  ? {
                      url: rink.photoUrl,
                      caption: `Foto ${timeAgo(rink.photoAt)}${rink.photoBy ? ` · ${rink.photoBy}` : ""}`,
                    }
                  : null
              }
            />
            <div>
              <CheckinWidget area="hockeyrink" />
            </div>
            {nextEvent && (
              <div className="sm:col-span-2">
                <EventCard e={nextEvent} compact />
              </div>
            )}
          </div>
        </div>
      </section>

      <SponsorSpotlight area="hockeyrink" />

      <div className="container py-8 grid gap-6 lg:grid-cols-3">
        {/* Status cards */}
        <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
          {statusQuery.isLoading ? (
            <>
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </>
          ) : (
            <>
              <StatusCard
                kind="plogad"
                label="Plogad"
                doneAt={statusQuery.data?.plogadAt ?? null}
                doneBy={statusQuery.data?.plogadBy ?? null}
                icon={<CloudSnow className="h-6 w-6" />}
                canAct={isRinkFunctionary}
                onMark={(helpers, photoUrl) =>
                  markPlogad.mutate({ helpers, photoUrl: photoUrl ?? undefined })
                }
                onUndo={() => undo.mutate({ kind: "plogad" })}
                pending={markPlogad.isPending || undo.isPending}
              />
              <StatusCard
                kind="spolad"
                label="Spolad"
                doneAt={statusQuery.data?.spoladAt ?? null}
                doneBy={statusQuery.data?.spoladBy ?? null}
                icon={<Droplets className="h-6 w-6" />}
                canAct={isRinkFunctionary}
                onMark={(helpers, photoUrl) =>
                  markSpolad.mutate({ helpers, photoUrl: photoUrl ?? undefined })
                }
                onUndo={() => undo.mutate({ kind: "spolad" })}
                pending={markSpolad.isPending || undo.isPending}
              />
            </>
          )}

          {statusQuery.data?.note && (
            <div className="sm:col-span-2 iso-card p-4 text-sm">
              <strong>Notering:</strong> {statusQuery.data.note}
            </div>
          )}

          {isRinkFunctionary && (
            <div className="sm:col-span-2 iso-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Jourverktyg
                </div>
                <PhotoPicker
                  value={null}
                  label="Nytt foto på isen"
                  onChange={(url) => url && setPhoto.mutate({ photoUrl: url })}
                />
              </div>
              <div className="mt-3 text-xs font-semibold text-muted-foreground">
                Stäng rinken tillfälligt
              </div>
              {closedMessage ? (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span>
                    Stängd: <strong>{closedMessage}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-card"
                    disabled={setClosed.isPending}
                    onClick={() => setClosed.mutate({ message: "" })}
                  >
                    Öppna igen
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={closeMsg}
                    onChange={(e) => setCloseMsg(e.target.value)}
                    placeholder="T.ex. Töväder – isen är blöt"
                    className="bg-card text-sm"
                  />
                  <Button
                    variant="outline"
                    className="bg-card"
                    disabled={!closeMsg.trim() || setClosed.isPending}
                    onClick={() => setClosed.mutate({ message: closeMsg })}
                  >
                    Stäng
                  </Button>
                </div>
              )}
            </div>
          )}

          {isAuthenticated && !isRinkFunctionary && (
            <div className="sm:col-span-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Status uppdateras av rinkjouren. Vill du
              hjälpa till? Hör av dig till en admin så läggs du in i schemat.
            </div>
          )}

          {!isAuthenticated && (
            <div className="sm:col-span-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground">
              Logga in för att boka och skriva på anslagstavlan.{" "}
              <button
                className="font-semibold text-primary underline"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Logga in
              </button>
            </div>
          )}
        </div>

        {/* Side column: weather + duty */}
        <div className="grid gap-6 content-start">
          {/* Weather */}
          <div className="iso-card p-6">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Thermometer className="h-4 w-4" /> Utomhus i Antnäs
            </div>
            {weatherQuery.isLoading ? (
              <Skeleton className="mt-3 h-12 w-32" />
            ) : weatherQuery.data?.ok ? (
              <>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">
                    {Math.round(temp as number)}°
                  </span>
                  <span className="mb-1.5 text-muted-foreground">C</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Wind className="h-4 w-4" />
                  {weatherQuery.data.windSpeed != null
                    ? `${Math.round(weatherQuery.data.windSpeed)} m/s vind${
                        weatherQuery.data.windGusts != null &&
                        Math.round(weatherQuery.data.windGusts) > Math.round(weatherQuery.data.windSpeed)
                          ? ` (byar ${Math.round(weatherQuery.data.windGusts)})`
                          : ""
                      }`
                    : "—"}
                </div>
                <div
                  className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold"
                  style={{
                    background: goodForFlooding
                      ? "oklch(0.72 0.13 184 / 0.12)"
                      : "oklch(0.75 0.16 75 / 0.15)",
                    color: goodForFlooding
                      ? "oklch(0.45 0.1 184)"
                      : "oklch(0.5 0.12 75)",
                  }}
                >
                  {goodForFlooding
                    ? "Bra förhållanden för spolning."
                    : "Kan vara för varmt för spolning just nu."}
                </div>
                {weatherQuery.data.source && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Prognos för Antnäs · {weatherQuery.data.source}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Temperaturen kunde inte hämtas just nu.
              </p>
            )}
          </div>

          <Link
            href="/notiser"
            className="iso-card flex items-center gap-3 p-5 text-sm hover:border-primary/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-bold">Få notis när isen är nyspolad</span>
              <span className="text-muted-foreground">Lägg appen på hemskärmen och slå på notiser →</span>
            </span>
          </Link>

          <Link
            href="/?flik=info"
            className="iso-card block p-5 text-sm hover:border-primary/40"
          >
            <div className="font-bold">Regler &amp; info</div>
            <div className="text-muted-foreground">
              Ordningsregler, ställ bort målen, var snön ska ligga →
            </div>
          </Link>

          {/* This week's duty */}
          <ThisWeekDuty area="hockeyrink" href="/?flik=jour" />

          <Leaderboard
            title="Insatser i säsong"
            subtitle="Plogning & spolning"
            data={leaderboardQuery.data}
            loading={leaderboardQuery.isLoading}
          />
        </div>
      </div>
      </>
      )}
    </SiteLayout>
  );
}

export function Leaderboard({
  title,
  subtitle,
  data,
  loading,
}: {
  title: string;
  subtitle: string;
  data: { name: string; count: number }[] | undefined;
  loading: boolean;
}) {
  const medal = ["oklch(0.78 0.14 90)", "oklch(0.7 0.02 250)", "oklch(0.65 0.12 50)"];
  return (
    <div className="iso-card p-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      {loading ? (
        <Skeleton className="mt-3 h-20" />
      ) : data && data.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {data.slice(0, 8).map((row, i) => (
            <li key={row.name} className="flex items-center gap-2 text-sm">
              <span
                className="grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold text-white shrink-0"
                style={{ background: medal[i] ?? "oklch(0.6 0.13 188)" }}
              >
                {i + 1}
              </span>
              <span className="font-semibold flex-1 min-w-0 truncate">
                {row.name}
              </span>
              <span className="text-muted-foreground">{row.count} st</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Inga insatser registrerade ännu.
        </p>
      )}
    </div>
  );
}
