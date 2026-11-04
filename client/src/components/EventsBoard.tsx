import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatJobWindow, fromStockholm, stockholmParts } from "@shared/jobs";
import { Hammer, MapPin, Megaphone, Pencil, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type Area = "hockeyrink" | "skidspar" | "alla";
type Answer = "yes" | "maybe" | "no";

const AREA_LABEL: Record<Area, string> = { hockeyrink: "Rinken", skidspar: "Skidspåret", alla: "Båda" };
const ANSWER_LABEL: Record<Answer, string> = { yes: "Kommer", maybe: "Kanske", no: "Kan inte" };
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const ymd = (d: Date) => stockholmParts(d).day;
const hhmm = (d: Date) => {
  const p = stockholmParts(d);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
};

type EventItem = {
  id: number;
  title: string;
  area: Area;
  startsAt: Date | string;
  endsAt: Date | string;
  location: string | null;
  description: string | null;
  audience: "all" | "functionaries";
  createdByName: string;
  canManage: boolean;
  myAnswer: Answer | null;
  myComment: string | null;
  counts: { yes: number; maybe: number; no: number };
  responses: { name: string; answer: Answer; comment: string | null }[];
};

/** Full page content: list of call-outs + "Kalla till arbetsdag" for functionaries. */
export default function EventsBoard() {
  // Only admins call people to a work day (done from the admin panel).
  const { isAdmin } = useAuth();
  const canCreate = isAdmin;
  const listQuery = trpc.events.list.useQuery(undefined, { refetchInterval: 60 * 1000 });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const events = (listQuery.data ?? []) as EventItem[];

  return (
    <div className="grid gap-4">
      {canCreate && !creating && !editing && (
        <Button className="w-fit gap-1.5" onClick={() => setCreating(true)}>
          <Megaphone className="h-4 w-4" /> Kalla till arbetsdag
        </Button>
      )}
      {(creating || editing) && (
        <EventForm
          event={editing ?? undefined}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      {listQuery.isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : events.length === 0 ? (
        <div className="iso-card p-6 text-sm text-muted-foreground">
          Inga planerade arbetsdagar just nu.
          {canCreate ? " Tryck ”Kalla till arbetsdag” för att bjuda in." : ""}
        </div>
      ) : (
        events.map((e) => (
          <EventCard key={e.id} e={e} onEdit={() => setEditing(e)} hidden={editing?.id === e.id} />
        ))
      )}
    </div>
  );
}

/** One call-out with answer buttons. `compact` is used on the home page. */
export function EventCard({
  e,
  onEdit,
  hidden,
  compact,
}: {
  e: EventItem;
  onEdit?: () => void;
  hidden?: boolean;
  compact?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [comment, setComment] = useState(e.myComment ?? "");
  const respond = trpc.events.respond.useMutation({
    onSuccess: (_r, v) => {
      utils.events.list.invalidate();
      if (v.answer === "yes") toast.success("Toppen – vi ses! 🙌");
    },
    onError: (err) => toast.error(err.message),
  });
  const cancel = trpc.events.cancel.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Kallelsen är inställd. De som svarat har fått en notis.");
    },
    onError: (err) => toast.error(err.message),
  });
  if (hidden) return null;

  const answer = (a: Answer) =>
    respond.mutate({ id: e.id, answer: e.myAnswer === a ? null : a, comment: comment.trim() || undefined });
  const byAnswer = (a: Answer) => e.responses.filter((r) => r.answer === a);

  return (
    <div className="iso-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Hammer className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold leading-tight">{e.title}</div>
          <div className="mt-0.5 text-sm font-semibold text-primary">
            {formatJobWindow(new Date(e.startsAt), new Date(e.endsAt))}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {e.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {e.location}
              </span>
            )}
            <span>{e.location ? "· " : ""}{AREA_LABEL[e.area]}</span>
            {e.audience === "functionaries" && <span>· Jourhavare</span>}
          </div>
        </div>
      </div>

      {!compact && e.description && (
        <p className="mt-3 whitespace-pre-line text-sm">{e.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
        <Users className="h-4 w-4 text-primary" />
        <strong>{e.counts.yes} kommer</strong>
        {e.counts.maybe > 0 && <span className="text-muted-foreground">· {e.counts.maybe} kanske</span>}
      </div>
      {!compact && e.responses.length > 0 && (
        <div className="mt-2 grid gap-1 text-sm">
          {(["yes", "maybe", "no"] as const).map((a) =>
            byAnswer(a).length ? (
              <div key={a}>
                <span className="font-semibold">{ANSWER_LABEL[a]}:</span>{" "}
                {byAnswer(a)
                  .map((r) => (r.comment ? `${r.name} (${r.comment})` : r.name))
                  .join(", ")}
              </div>
            ) : null
          )}
        </div>
      )}

      {isAuthenticated ? (
        <div className="mt-4 grid gap-2">
          <div className="flex flex-wrap gap-2">
            {(["yes", "maybe", "no"] as const).map((a) => (
              <Button
                key={a}
                size="sm"
                variant={e.myAnswer === a ? (a === "no" ? "destructive" : "default") : "outline"}
                className={e.myAnswer === a ? "" : "bg-card"}
                disabled={respond.isPending}
                onClick={() => answer(a)}
              >
                {a === "yes" ? "✅ " : a === "maybe" ? "🤔 " : "❌ "}
                {ANSWER_LABEL[a]}
              </Button>
            ))}
          </div>
          {!compact && (e.myAnswer === "yes" || e.myAnswer === "maybe") && (
            <div className="flex gap-2">
              <Input
                value={comment}
                onChange={(ev) => setComment(ev.target.value.slice(0, 200))}
                placeholder="Kommentar, t.ex. ”tar med skottkärra”"
                className="bg-card text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="bg-card"
                disabled={respond.isPending || comment === (e.myComment ?? "")}
                onClick={() => respond.mutate({ id: e.id, answer: e.myAnswer, comment: comment.trim() || undefined })}
              >
                Spara
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          <button className="font-semibold text-primary underline" onClick={() => (window.location.href = getLoginUrl())}>
            Logga in
          </button>{" "}
          för att svara.
        </p>
      )}

      {compact ? (
        <Link href="/arbetsdagar" className="mt-3 inline-block text-sm font-semibold text-primary">
          Mer info och vilka som kommer →
        </Link>
      ) : (
        e.canManage && (
          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <Button size="sm" variant="ghost" className="gap-1" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Ändra
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={cancel.isPending}
              onClick={() => {
                if (confirm("Ställa in? De som svarat får en notis.")) cancel.mutate({ id: e.id });
              }}
            >
              Ställ in
            </Button>
          </div>
        )
      )}
    </div>
  );
}

function EventForm({ event, onDone }: { event?: EventItem; onDone: () => void }) {
  const utils = trpc.useUtils();
  const tomorrow = ymd(new Date(Date.now() + 24 * 3600 * 1000));
  const today = ymd(new Date());
  const init = useMemo(
    () =>
      event
        ? {
            day: ymd(new Date(event.startsAt)),
            from: hhmm(new Date(event.startsAt)),
            to: hhmm(new Date(event.endsAt)),
          }
        : { day: tomorrow, from: "10:00", to: "14:00" },
    [event, tomorrow]
  );
  const [title, setTitle] = useState(event?.title ?? "Arbetsdag på rinken");
  const [area, setArea] = useState<Area>(event?.area ?? "hockeyrink");
  const [day, setDay] = useState(init.day);
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [audience, setAudience] = useState<"all" | "functionaries">(event?.audience ?? "all");

  const create = trpc.events.create.useMutation({
    onSuccess: (r) => {
      utils.events.list.invalidate();
      toast.success(
        `Kallelsen är skickad till ${r.reach} personer${r.mailed ? ` (${r.mailed} via e-post)` : ""}.${
          r.pushedNow ? "" : " Notisen går ut kl 07."
        }`
      );
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.events.update.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("Kallelsen är ändrad.");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
    }`;

  function submit() {
    if (!title.trim()) return toast.error("Skriv en rubrik.");
    const start = fromStockholm(day, from);
    let end = fromStockholm(day, to);
    if (end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000);
    const data = {
      title: title.trim(),
      area,
      startsAt: start.getTime(),
      endsAt: end.getTime(),
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      audience,
    };
    if (event) update.mutate({ id: event.id, ...data });
    else create.mutate(data);
  }

  return (
    <div className="iso-card grid gap-4 p-5">
      <h3 className="font-extrabold">{event ? "Ändra kallelse" : "Kalla till arbetsdag"}</h3>
      <div className="grid gap-1.5">
        <Label htmlFor="ev-title">Rubrik</Label>
        <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <div className="mb-1.5 text-sm font-semibold">Var?</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
            <button key={a} type="button" className={chip(area === a)} onClick={() => setArea(a)}>
              {AREA_LABEL[a]}
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
          {[
            [from, setFrom, "Från"],
            [to, setTo, "Till"],
          ].map(([v, set, label], i) => (
            <span key={label as string} className="flex items-center gap-2">
              {i === 1 && <span className="text-muted-foreground">–</span>}
              <Select value={v as string} onValueChange={set as (x: string) => void}>
                <SelectTrigger className="w-24 bg-card" aria-label={label as string}>
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
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ev-loc">Plats (valfritt)</Label>
        <Input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="T.ex. vid förrådet" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ev-desc">Vad ska göras / ta med (valfritt)</Label>
        <Textarea
          id="ev-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={"T.ex. laga sargen, byta lampor.\nTa med: skruvdragare, arbetshandskar. Fika finns!"}
        />
      </div>
      <div>
        <div className="mb-1.5 text-sm font-semibold">Vilka ska kallas?</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(audience === "all")} onClick={() => setAudience("all")}>
            Alla med konto
          </button>
          <button type="button" className={chip(audience === "functionaries")} onClick={() => setAudience("functionaries")}>
            Bara jourhavare
          </button>
        </div>
        {!event && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            De får en notis (om de slagit på notiser) och ett mejl (om de har e-post i kontot).
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={submit} disabled={create.isPending || update.isPending}>
          {event ? "Spara ändring" : "Skicka kallelse"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}
