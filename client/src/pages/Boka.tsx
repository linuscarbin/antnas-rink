import { useAuth } from "@/_core/hooks/useAuth";
import SiteLayout from "@/components/SiteLayout";
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
import { formatTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ZONE_LABELS, ZONES, type Zone } from "@shared/rink";
import { CalendarDays, Clock, MapPin, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const ZONE_COLOR: Record<Zone, string> = {
  "full rink": "oklch(0.6 0.17 250)",
  "one end": "oklch(0.7 0.18 25)",
  "half rink": "oklch(0.72 0.13 184)",
};

type BookingRow = {
  id: number;
  title: string;
  zone: string;
  startTime: Date | string;
  endTime: Date | string;
};

/** A 7-day overview grid showing booked blocks per day. */
function WeekGrid({ bookings }: { bookings: BookingRow[] }) {
  const days = useMemo(() => {
    const out: { date: Date; key: string }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push({ date: d, key: d.toDateString() });
    }
    return out;
  }, []);

  return (
    <div className="iso-card p-4">
      <div className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
        Översikt kommande 7 dagar
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ date, key }) => {
          const dayBookings = bookings
            .filter((b) => new Date(b.startTime).toDateString() === key)
            .sort(
              (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
          const isToday = key === new Date().toDateString();
          return (
            <div key={key} className="flex flex-col min-w-0">
              <div
                className={`text-center rounded-md py-1 text-xs font-bold ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <div className="capitalize">
                  {date.toLocaleDateString("sv-SE", { weekday: "short" })}
                </div>
                <div className="text-[11px] font-semibold">
                  {date.getDate()}/{date.getMonth() + 1}
                </div>
              </div>
              <div className="mt-1.5 space-y-1 min-h-[60px]">
                {dayBookings.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/60 py-2 text-center text-[10px] text-muted-foreground">
                    Ledigt
                  </div>
                ) : (
                  dayBookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-md px-1.5 py-1 text-[10px] font-semibold text-white truncate"
                      style={{ background: ZONE_COLOR[b.zone as Zone] }}
                      title={`${b.title} (${ZONE_LABELS[b.zone as Zone]})`}
                    >
                      {formatTime(b.startTime)} {b.title}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Boka() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [fromTime] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const bookingsQuery = trpc.bookings.list.useQuery({ fromTime });

  const [title, setTitle] = useState("");
  const [zone, setZone] = useState<Zone>("full rink");
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [note, setNote] = useState("");

  const create = trpc.bookings.create.useMutation({
    onSuccess: () => {
      utils.bookings.list.invalidate();
      setTitle("");
      setNote("");
      toast.success("Bokning skapad!");
    },
    onError: (e) => toast.error(e.message),
  });
  const cancel = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      utils.bookings.list.invalidate();
      toast.success("Bokning avbokad.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Group bookings by day.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof bookingsQuery.data>();
    (bookingsQuery.data ?? []).forEach((b) => {
      const key = new Date(b.startTime).toLocaleDateString("sv-SE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr as typeof bookingsQuery.data);
    });
    return Array.from(map.entries());
  }, [bookingsQuery.data]);

  function submit() {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!title.trim()) return toast.error("Ange vad bokningen gäller.");
    if (e <= s) return toast.error("Sluttiden måste vara efter starttiden.");
    create.mutate({ title: title.trim(), zone, startTime: s, endTime: e, note });
  }

  return (
    <SiteLayout>
      <div className="container py-8 grid gap-6 lg:grid-cols-3">
        {/* Booking form */}
        <div className="lg:col-span-1">
          <div className="iso-card p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-extrabold tracking-tight">Boka rinken</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Boka hela rinken eller en zon.
            </p>

            {isAuthenticated ? (
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>Vad gäller bokningen?</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ishockeyträning, öppen åkning…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Zon</Label>
                  <Select value={zone} onValueChange={(v) => setZone(v as Zone)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          {ZONE_LABELS[z]} ({z})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start</Label>
                    <Input
                      type="datetime-local"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slut</Label>
                    <Input
                      type="datetime-local"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notering (valfritt)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  className="w-full font-semibold"
                  onClick={submit}
                  disabled={create.isPending}
                >
                  Boka
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground">
                Logga in för att boka rinken.{" "}
                <button
                  className="font-semibold text-primary underline"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Logga in
                </button>
              </div>
            )}

            <div className="mt-5 border-t border-border/60 pt-4">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Zoner
              </div>
              <div className="space-y-1.5 text-sm">
                {ZONES.map((z) => (
                  <div key={z} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded"
                      style={{ background: ZONE_COLOR[z] }}
                    />
                    <span className="font-semibold">{ZONE_LABELS[z]}</span>
                    <span className="text-muted-foreground">({z})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar / list */}
        <div className="lg:col-span-2">
          <WeekGrid bookings={bookingsQuery.data ?? []} />

          <div className="flex items-center gap-2 mb-4 mt-8">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-extrabold tracking-tight">
              Kommande bokningar
            </h2>
          </div>

          {bookingsQuery.isError && (
            <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Kunde inte hämta bokningar just nu. Försök igen om en stund.
            </div>
          )}

          {bookingsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : grouped.length > 0 ? (
            <div className="space-y-6">
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-2 capitalize">
                    {day}
                  </h3>
                  <div className="space-y-2">
                    {(items ?? []).map((b) => {
                      const mine = user && b.userId === user.id;
                      const canCancel = mine || user?.role === "admin";
                      return (
                        <div
                          key={b.id}
                          className="iso-card p-4 flex items-center gap-4"
                        >
                          <span
                            className="h-10 w-1.5 rounded-full shrink-0"
                            style={{ background: ZONE_COLOR[b.zone as Zone] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold truncate">
                              {b.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatTime(b.startTime)}–{formatTime(b.endTime)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {ZONE_LABELS[b.zone as Zone]}
                              </span>
                              {b.bookedByName && <span>· {b.bookedByName}</span>}
                            </div>
                          </div>
                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cancel.mutate({ id: b.id })}
                              disabled={cancel.isPending}
                              aria-label="Avboka"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="iso-card p-8 text-center text-muted-foreground">
              Inga kommande bokningar. Bli först att boka!
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
