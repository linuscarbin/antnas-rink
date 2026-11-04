import { useAuth } from "@/_core/hooks/useAuth";
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
import { trpc } from "@/lib/trpc";
import {
  AREA_JOB_KINDS,
  formatJobWindow,
  fromStockholm,
  JOB_KIND_LABEL,
  stockholmParts,
  type JobKind,
} from "@shared/jobs";
import { CalendarClock, Check, CheckCircle2, Clock, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Area = "hockeyrink" | "skidspar";
const AREA_LABEL: Record<Area, string> = { hockeyrink: "Rinken", skidspar: "Spåret" };

/** "Klart" also updates the public status card for these kinds. */
const DONE_LABEL: Record<JobKind, string> = {
  plog: "Klart – markera plogad",
  spol: "Klart – markera spolad",
  plog_spol: "Klart – plogad + spolad",
  spar: "Klart – markera draget",
  annat: "Klart",
};

/** "HH:MM" every 30 minutes. */
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

// All dates/times in the form are Swedish time, whatever the phone's zone.
const ymd = (d: Date) => stockholmParts(d).day;
const toDate = fromStockholm;

/** Default window: this evening 18–20, or the next full hours if already later. */
function defaultWindow() {
  const now = new Date();
  const h = stockholmParts(now).hour;
  if (h < 17) return { day: ymd(now), from: "18:00", to: "20:00" };
  if (h < 21) {
    const from = `${String(h + 1).padStart(2, "0")}:00`;
    const to = `${String(Math.min(h + 3, 23)).padStart(2, "0")}:00`;
    return { day: ymd(now), from, to };
  }
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  return { day: ymd(tomorrow), from: "07:00", to: "09:00" };
}

/**
 * "Jag kan ploga 18–20 – vem hänger med?": propose a job to your duty team
 * and answer others' proposals with one tap.
 */
export default function JobsBoard({ area }: { area?: Area } = {}) {
  const { isRinkFunctionary, isTrackFunctionary } = useAuth();
  const areas: Area[] = area
    ? [area]
    : [
        ...(isRinkFunctionary ? (["hockeyrink"] as const) : []),
        ...(isTrackFunctionary ? (["skidspar"] as const) : []),
      ];
  const utils = trpc.useUtils();
  const listQuery = trpc.jobs.list.useQuery(undefined, { refetchInterval: 60 * 1000 });
  const onError = (e: { message: string }) => toast.error(e.message);
  const refresh = () => utils.jobs.list.invalidate();
  const respond = trpc.jobs.respond.useMutation({ onSuccess: refresh, onError });
  const setStatus = trpc.jobs.setStatus.useMutation({
    onSuccess: (_r, vars) => {
      refresh();
      utils.status.get.invalidate();
      utils.status.leaderboard.invalidate();
      utils.track.get.invalidate();
      utils.track.leaderboard.invalidate();
      if (vars.status === "done") toast.success("Bra jobbat! Statusen är uppdaterad.");
    },
    onError,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditJob | null>(null);
  const jobs = (listQuery.data ?? []).filter((j) => !area || j.area === area);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <CalendarClock className="h-5 w-5 text-primary" /> Planera jobb
        </h2>
        {!open && (
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Jag kan …
          </Button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Säg när du kan ploga, spola eller dra spår – laget får en notis och svarar med ett tryck.
      </p>

      {open && areas.length > 0 && (
        <NewJobForm
          areas={areas}
          onDone={() => {
            setOpen(false);
            refresh();
          }}
          onCancel={() => setOpen(false)}
        />
      )}

      <div className="mt-3 grid gap-2">
        {listQuery.isLoading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : jobs.length === 0 ? (
          !open && (
            <p className="text-sm text-muted-foreground">Inga planerade jobb just nu.</p>
          )
        ) : (
          jobs.map((j) => {
            const done = j.status === "done";
            return (
              <div key={j.id} className={`iso-card p-4 ${done ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold">
                      {JOB_KIND_LABEL[j.kind]} {formatJobWindow(new Date(j.startsAt), new Date(j.endsAt))}
                      {done && <span className="ml-2 text-xs font-bold text-primary">Klart</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {j.mine ? "Du" : j.createdByName} · {AREA_LABEL[j.area]}
                      {j.note ? ` · ${j.note}` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        ✅ {[j.mine ? "Du" : j.createdByName, ...j.yes].join(", ")}
                      </span>
                      {j.no.length > 0 && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
                          ❌ {j.no.join(", ")}
                        </span>
                      )}
                      {!done && j.pending.length > 0 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          Ej svarat: {j.pending.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {editing?.id === j.id && (
                  <NewJobForm
                    areas={[j.area]}
                    job={editing}
                    onDone={() => {
                      setEditing(null);
                      refresh();
                    }}
                    onCancel={() => setEditing(null)}
                  />
                )}
                {!done && editing?.id !== j.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!j.mine && (
                      <>
                        <Button
                          size="sm"
                          variant={j.myAnswer === "yes" ? "default" : "outline"}
                          className={j.myAnswer === "yes" ? "gap-1" : "gap-1 bg-card"}
                          disabled={respond.isPending}
                          onClick={() => respond.mutate({ id: j.id, answer: j.myAnswer === "yes" ? null : "yes" })}
                        >
                          <Check className="h-4 w-4" /> Jag kan
                        </Button>
                        <Button
                          size="sm"
                          variant={j.myAnswer === "no" ? "destructive" : "outline"}
                          className={j.myAnswer === "no" ? "gap-1" : "gap-1 bg-card"}
                          disabled={respond.isPending}
                          onClick={() => respond.mutate({ id: j.id, answer: j.myAnswer === "no" ? null : "no" })}
                        >
                          <X className="h-4 w-4" /> Kan inte
                        </Button>
                      </>
                    )}
                    {j.canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() =>
                            setEditing({
                              id: j.id,
                              area: j.area,
                              kind: j.kind,
                              startsAt: new Date(j.startsAt),
                              endsAt: new Date(j.endsAt),
                              note: j.note ?? "",
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" /> Ändra
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 bg-card"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: j.id, status: "done" })}
                        >
                          <CheckCircle2 className="h-4 w-4" /> {DONE_LABEL[j.kind]}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          disabled={setStatus.isPending}
                          onClick={() => {
                            if (confirm("Ställa in jobbet? De som svarat ja får en notis.")) {
                              setStatus.mutate({ id: j.id, status: "cancelled" });
                            }
                          }}
                        >
                          Ställ in
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

type EditJob = {
  id: number;
  area: Area;
  kind: JobKind;
  startsAt: Date;
  endsAt: Date;
  note: string;
};

const hhmm = (d: Date) => {
  const p = stockholmParts(d);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
};

function NewJobForm({
  areas,
  job,
  onDone,
  onCancel,
}: {
  areas: Area[];
  /** When set, the form edits this job instead of proposing a new one. */
  job?: EditJob;
  onDone: () => void;
  onCancel: () => void;
}) {
  const init = useMemo(
    () =>
      job
        ? { day: stockholmParts(job.startsAt).day, from: hhmm(job.startsAt), to: hhmm(job.endsAt) }
        : defaultWindow(),
    [job]
  );
  const [area, setArea] = useState<Area>(job?.area ?? areas[0]);
  const [kind, setKind] = useState<JobKind>(job?.kind ?? AREA_JOB_KINDS[areas[0]][0]);
  const [day, setDay] = useState(init.day);
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [note, setNote] = useState(job?.note ?? "");
  const create = trpc.jobs.create.useMutation({
    onSuccess: () => {
      toast.success("Skickat till laget!");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.jobs.update.useMutation({
    onSuccess: () => {
      toast.success("Jobbet är ändrat.");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  const today = ymd(new Date());
  const tomorrow = ymd(new Date(Date.now() + 24 * 3600 * 1000));
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
    }`;

  function submit() {
    const start = toDate(day, from);
    let end = toDate(day, to);
    if (end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000); // e.g. 22:00–01:00
    const data = { kind, startsAt: start.getTime(), endsAt: end.getTime(), note: note.trim() || undefined };
    if (job) update.mutate({ id: job.id, ...data });
    else create.mutate({ area, ...data });
  }

  return (
    <div className="iso-card mt-3 grid gap-4 p-5">
      {areas.length > 1 && (
        <div className="flex gap-2">
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              className={chip(area === a)}
              onClick={() => {
                setArea(a);
                setKind(AREA_JOB_KINDS[a][0]);
              }}
            >
              {AREA_LABEL[a]}
            </button>
          ))}
        </div>
      )}

      <div>
        <div className="mb-1.5 text-sm font-semibold">Jag kan …</div>
        <div className="flex flex-wrap gap-2">
          {AREA_JOB_KINDS[area].map((k) => (
            <button key={k} type="button" className={chip(kind === k)} onClick={() => setKind(k)}>
              {JOB_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-sm font-semibold">När?</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={chip(day === today)} onClick={() => setDay(today)}>
            Idag
          </button>
          <button type="button" className={chip(day === tomorrow)} onClick={() => setDay(tomorrow)}>
            Imorgon
          </button>
          <Input
            type="date"
            value={day}
            min={today}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="w-auto bg-card"
            aria-label="Datum"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <TimeSelect value={from} onChange={setFrom} label="Från" />
          <span className="text-muted-foreground">–</span>
          <TimeSelect value={to} onChange={setTo} label="Till" />
        </div>
      </div>

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 300))}
        placeholder="Notering (valfritt), t.ex. ”behöver en till för spolningen”"
        className="bg-card"
      />

      <div className="flex gap-2">
        <Button onClick={submit} disabled={create.isPending || update.isPending}>
          {job ? "Spara ändring" : "Skicka till laget"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-24 bg-card" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {TIMES.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
