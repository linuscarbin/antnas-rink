import { useAuth } from "@/_core/hooks/useAuth";
import IsoDecor from "@/components/IsoDecor";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { timeAgo } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { getIsoWeek } from "@shared/rink";
import {
  CheckCircle2,
  CloudSnow,
  Droplets,
  Phone,
  Snowflake,
  Thermometer,
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
  pending,
}: {
  kind: "plogad" | "spolad";
  label: string;
  doneAt: Date | string | null;
  doneBy: string | null;
  icon: React.ReactNode;
  canAct: boolean;
  onMark: () => void;
  pending: boolean;
}) {
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
        <Button
          onClick={onMark}
          disabled={pending}
          variant="outline"
          className="bg-card font-semibold"
        >
          Markera som {kind} nu
        </Button>
      )}
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const statusQuery = trpc.status.get.useQuery();
  const weatherQuery = trpc.weather.current.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000,
  });
  const [now] = useState(() => new Date());
  const { year, week } = getIsoWeek(now);
  const dutyQuery = trpc.duty.list.useQuery({ year });
  const thisWeekDuty = dutyQuery.data?.find((d) => d.week === week);

  const markPlogad = trpc.status.markPlogad.useMutation({
    onSuccess: () => {
      utils.status.get.invalidate();
      toast.success("Status uppdaterad: plogad");
    },
    onError: (e) => toast.error(e.message),
  });
  const markSpolad = trpc.status.markSpolad.useMutation({
    onSuccess: () => {
      utils.status.get.invalidate();
      toast.success("Status uppdaterad: spolad");
    },
    onError: (e) => toast.error(e.message),
  });

  const temp = weatherQuery.data?.temperature;
  const goodForFlooding = typeof temp === "number" && temp <= -4;

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <IsoDecor />
        <div className="container relative py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Snowflake className="h-3.5 w-3.5" /> Antnäs Vinter
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight">
              Är isen <span className="text-primary">åkbar</span> ikväll?
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Här ser du om rinken är plogad och spolad, vem som har jour och du
              kan boka tid eller skriva på anslagstavlan.
            </p>
          </div>
        </div>
      </section>

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
                canAct={isAuthenticated}
                onMark={() => markPlogad.mutate({ done: true })}
                pending={markPlogad.isPending}
              />
              <StatusCard
                kind="spolad"
                label="Spolad"
                doneAt={statusQuery.data?.spoladAt ?? null}
                doneBy={statusQuery.data?.spoladBy ?? null}
                icon={<Droplets className="h-6 w-6" />}
                canAct={isAuthenticated}
                onMark={() => markSpolad.mutate({ done: true })}
                pending={markSpolad.isPending}
              />
            </>
          )}

          {statusQuery.data?.note && (
            <div className="sm:col-span-2 iso-card p-4 text-sm">
              <strong>Notering:</strong> {statusQuery.data.note}
            </div>
          )}

          {!isAuthenticated && (
            <div className="sm:col-span-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground">
              Logga in för att uppdatera status, boka och skriva på
              anslagstavlan.{" "}
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
                    ? `${Math.round(weatherQuery.data.windSpeed)} m/s vind`
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
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Temperaturen kunde inte hämtas just nu.
              </p>
            )}
          </div>

          {/* This week's duty */}
          <div className="iso-card p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Vecka {week} · Jour
              </div>
              <Link href="/schema" className="text-sm font-semibold text-primary">
                Hela schemat
              </Link>
            </div>
            {dutyQuery.isLoading ? (
              <Skeleton className="mt-3 h-20" />
            ) : thisWeekDuty ? (
              <div className="mt-3 space-y-3">
                <DutyRow
                  label="Plogjour"
                  name={thisWeekDuty.plogjourName}
                  phone={thisWeekDuty.plogjourPhone}
                  conflict={thisWeekDuty.plogjourConflict}
                />
                <DutyRow
                  label="Spoljour"
                  name={thisWeekDuty.spoljourName}
                  phone={thisWeekDuty.spoljourPhone}
                  conflict={thisWeekDuty.spoljourConflict}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Ingen jour inlagd för denna vecka ännu.
              </p>
            )}
          </div>

          {/* Ski track shortcut */}
          <TrackCard />
        </div>
      </div>
    </SiteLayout>
  );
}

function TrackCard() {
  const trackQuery = trpc.track.get.useQuery();
  const t = trackQuery.data;
  const dragetFresh = t?.dragetAt
    ? Date.now() - new Date(t.dragetAt).getTime() < 48 * 3600 * 1000
    : false;
  return (
    <div className="iso-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Skidspåret
        </div>
        <Link href="/skidspar" className="text-sm font-semibold text-primary">
          Öppna
        </Link>
      </div>
      {trackQuery.isLoading ? (
        <Skeleton className="mt-3 h-16" />
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: dragetFresh
                  ? "oklch(0.72 0.13 184)"
                  : "oklch(0.75 0.16 75)",
              }}
            />
            <span className="font-semibold">
              {t?.dragetAt
                ? dragetFresh
                  ? "Draget nyligen"
                  : "Kan behöva dras"
                : "Ej draget"}
            </span>
            {t?.dragetAt && (
              <span className="text-muted-foreground">{timeAgo(t.dragetAt)}</span>
            )}
          </div>
          <div className="text-muted-foreground">
            Spårskick:{" "}
            <strong className="text-foreground">{t?.condition ?? "Ej bedömt"}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function DutyRow({
  label,
  name,
  phone,
  conflict,
}: {
  label: string;
  name: string | null;
  phone: string | null;
  conflict: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="font-semibold">
          {name || "—"}
          {conflict && (
            <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">
              Förhinder
            </span>
          )}
        </div>
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <Phone className="h-3.5 w-3.5" /> {phone}
        </a>
      )}
    </div>
  );
}
