import PhotoPicker from "@/components/PhotoPicker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { JOB_KIND_LABEL, formatJobWindow } from "@shared/jobs";
import { Check, ChevronDown, Hammer, MessagesSquare, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSearch } from "wouter";

type Area = "hockeyrink" | "skidspar";

const stamp = (d: Date | string) => {
  const date = new Date(d);
  const today = new Date().toDateString() === date.toDateString();
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    ...(today ? {} : { weekday: "short" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * "Lagchatt": chat for the duty team, under the Jour tab. Jobs from
 * "Planera jobb" appear in the flow as cards you can answer right here,
 * with small lines when someone joins, it's done or it's cancelled.
 */
export default function TeamChat({ area }: { area: Area }) {
  const teamsQuery = trpc.teamChat.teams.useQuery({ area });
  const teams = teamsQuery.data ?? [];
  const wanted = Number(new URLSearchParams(useSearch()).get("lag")) || null;
  const [picked, setPicked] = useState<number | null>(null);
  const team = teams.find((t) => t.id === (picked ?? wanted)) ?? teams[0];
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? Boolean(team && (team.onDuty || wanted === team.id));

  if (teamsQuery.isLoading) return <Skeleton className="h-16 rounded-2xl" />;
  if (!team) return null;

  return (
    <section className="iso-card overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <MessagesSquare className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">Lagchatt · {team.name}</span>
          <span className="block text-xs text-muted-foreground">
            {team.onDuty ? "Har jour denna vecka" : "Prata ihop er – jobb från Planera jobb syns här också"}
          </span>
        </span>
        {team.onDuty && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">Jour</span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          {teams.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t border-border px-5 py-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPicked(t.id)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                    t.id === team.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  }`}
                >
                  {t.name}
                  {t.onDuty ? " · jour" : ""}
                </button>
              ))}
            </div>
          )}
          <ChatBody key={team.id} teamId={team.id} />
        </>
      )}
    </section>
  );
}

function ChatBody({ teamId }: { teamId: number }) {
  const utils = trpc.useUtils();
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  const { data, isLoading } = trpc.teamChat.list.useQuery(
    { teamId },
    { refetchInterval: visible ? 8000 : false, refetchOnWindowFocus: true }
  );
  const refresh = () => {
    utils.teamChat.list.invalidate({ teamId });
    utils.jobs.list.invalidate();
  };
  const send = trpc.teamChat.send.useMutation({ onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const del = trpc.teamChat.delete.useMutation({ onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const respond = trpc.jobs.respond.useMutation({ onSuccess: refresh, onError: (e) => toast.error(e.message) });

  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messages = data ?? [];
  const lastId = messages.at(-1)?.id;

  // Stick to the newest message.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  function submit() {
    const body = text.trim();
    if (!body && !photo) return;
    send.mutate(
      { teamId, body, photoUrl: photo ?? undefined },
      {
        onSuccess: () => {
          setText("");
          setPhoto(null);
        },
      }
    );
  }

  return (
    <div className="border-t border-border">
      <div ref={listRef} className="max-h-[60vh] min-h-40 space-y-2 overflow-y-auto bg-muted/30 px-3 py-3 sm:px-5">
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Inga meddelanden än. Säg hej till laget! 👋
          </p>
        ) : (
          messages.map((m) => {
            if (m.kind === "event") {
              return (
                <div key={m.id} className="text-center text-xs text-muted-foreground">
                  {m.body} · {stamp(m.createdAt)}
                </div>
              );
            }
            if (m.kind === "job") {
              const j = m.job;
              if (!j) return null;
              const open = j.status === "open";
              return (
                <div key={m.id} className="mx-auto max-w-md rounded-xl border border-primary/30 bg-card p-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <Hammer className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">
                        {j.createdByName} kan {JOB_KIND_LABEL[j.kind].toLowerCase()}{" "}
                        {formatJobWindow(new Date(j.startsAt), new Date(j.endsAt))}
                      </div>
                      {j.note && <div className="text-sm text-muted-foreground">{j.note}</div>}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {j.status === "done" ? "✅ Klart" : j.status === "cancelled" ? "Inställt" : "Planerat"}
                        {j.yes.length > 0 && ` · Med: ${j.yes.join(", ")}`}
                        {j.no.length > 0 && ` · Kan inte: ${j.no.join(", ")}`}
                        {" · "}
                        {stamp(m.createdAt)}
                      </div>
                    </div>
                  </div>
                  {open && !j.mine && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant={j.myAnswer === "yes" ? "default" : "outline"}
                        className="h-8 flex-1 gap-1 bg-card data-[on=true]:bg-primary"
                        data-on={j.myAnswer === "yes"}
                        disabled={respond.isPending}
                        onClick={() => respond.mutate({ id: j.id, answer: j.myAnswer === "yes" ? null : "yes" })}
                      >
                        <Check className="h-3.5 w-3.5" /> Jag kan
                      </Button>
                      <Button
                        size="sm"
                        variant={j.myAnswer === "no" ? "default" : "outline"}
                        className="h-8 flex-1 gap-1 bg-card data-[on=true]:bg-primary"
                        data-on={j.myAnswer === "no"}
                        disabled={respond.isPending}
                        onClick={() => respond.mutate({ id: j.id, answer: j.myAnswer === "no" ? null : "no" })}
                      >
                        <X className="h-3.5 w-3.5" /> Kan inte
                      </Button>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`group max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card"
                  }`}
                >
                  {!m.mine && <div className="text-xs font-bold text-primary">{m.name}</div>}
                  {m.photoUrl && (
                    <a href={m.photoUrl} target="_blank" rel="noreferrer" className="mt-1 block">
                      <img src={m.photoUrl} alt="Foto" loading="lazy" className="max-h-60 rounded-lg object-cover" />
                    </a>
                  )}
                  {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                  <div className={`mt-0.5 flex items-center gap-2 text-[10px] ${m.mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {stamp(m.createdAt)}
                    {m.canDelete && (
                      <button
                        type="button"
                        className="underline"
                        onClick={() => confirm("Ta bort meddelandet?") && del.mutate({ id: m.id })}
                      >
                        Ta bort
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border bg-card px-3 py-2 sm:px-5">
        <PhotoPicker value={photo} onChange={setPhoto} label="" />
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder="Skriv till laget…"
          className="max-h-32 min-h-10 flex-1 resize-none bg-background text-sm"
          aria-label="Meddelande till laget"
        />
        <Button
          size="icon"
          className="shrink-0"
          disabled={send.isPending || (!text.trim() && !photo)}
          onClick={submit}
          aria-label="Skicka"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
