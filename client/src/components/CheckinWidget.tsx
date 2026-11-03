import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Clock, MapPin, Minus, Plus, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Area = "hockeyrink" | "skidspar";

const TEXT: Record<Area, { place: string; here: string; emoji: string }> = {
  hockeyrink: { place: "rinken", here: "Jag är på rinken nu", emoji: "🏒" },
  skidspar: { place: "spåret", here: "Jag är i spåret nu", emoji: "⛷️" },
};

const STORAGE_KEY = "antnas-checkin-keys";

type StoredKey = { key: string; until: number };

function loadKeys(): StoredKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as StoredKey[]) : [];
    return list.filter((k) => k && typeof k.key === "string" && k.until > Date.now());
  } catch {
    return [];
  }
}

function saveKeys(list: StoredKey[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    // private mode etc. — removal just won't be offered later
  }
}

function newKey(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
}

/** Next few half-hour slots from now, within the next ~6 hours. */
function upcomingSlots(now = new Date()): Date[] {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  const slots: Date[] = [];
  for (let i = 0; i < 12; i++) {
    slots.push(new Date(d.getTime() + i * 30 * 60 * 1000));
  }
  return slots;
}

function label(name: string | null, people: number): string {
  const who = name || (people > 1 ? "Ett gäng" : "Någon");
  if (people > 1 && name) return `${who} +${people - 1}`;
  if (people > 1) return `${who} (${people} st)`;
  return who;
}

/**
 * "Vem är på rinken?" — anyone (no login needed) can say they are there now
 * or coming later. Entries disappear automatically after ~3 hours.
 */
export default function CheckinWidget({ area }: { area: Area }) {
  const t = TEXT[area];
  const utils = trpc.useUtils();
  const [keys, setKeys] = useState<StoredKey[]>(() => loadKeys());
  const myKeys = useMemo(() => keys.map((k) => k.key), [keys]);
  const listQuery = trpc.checkins.list.useQuery(
    { myKeys },
    { refetchInterval: 60 * 1000 }
  );
  const [name, setName] = useState("");
  const [people, setPeople] = useState(1);
  const [pickingTime, setPickingTime] = useState(false);

  const create = trpc.checkins.create.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.checkins.remove.useMutation({
    onSuccess: () => utils.checkins.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  async function checkIn(arriveAt?: Date) {
    const key = newKey();
    const until = (arriveAt ?? new Date()).getTime() + 3 * 3600 * 1000;
    await create.mutateAsync({
      area,
      displayName: name.trim() || undefined,
      people,
      arriveAt: arriveAt?.getTime(),
      ownerKey: key,
    });
    const next = [...loadKeys(), { key, until }];
    saveKeys(next);
    setKeys(next);
    setPickingTime(false);
    toast.success(
      arriveAt ? `Snyggt! Du syns som "kommer ${formatTime(arriveAt)}".` : "Snyggt! Nu syns du på sidan."
    );
  }

  const now = Date.now();
  const rows = (listQuery.data ?? []).filter((r) => r.area === area);
  const hereNow = rows.filter((r) => new Date(r.arriveAt).getTime() <= now);
  const later = rows.filter((r) => new Date(r.arriveAt).getTime() > now);
  const countNow = hereNow.reduce((sum, r) => sum + r.people, 0);
  const countLater = later.reduce((sum, r) => sum + r.people, 0);

  return (
    <div className="iso-card p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <Users className="h-4 w-4" /> Vem är på {t.place}?
      </div>

      {listQuery.isLoading ? (
        <Skeleton className="mt-3 h-14" />
      ) : (
        <div className="mt-2">
          <div className="text-2xl font-extrabold tracking-tight">
            {countNow > 0 ? (
              <>
                {t.emoji} {countNow} {countNow === 1 ? "person" : "personer"} på {t.place} nu
              </>
            ) : (
              <span className="text-muted-foreground">Ingen har checkat in – var först!</span>
            )}
          </div>
          {countLater > 0 && (
            <div className="mt-0.5 text-sm font-semibold text-primary">
              + {countLater} kommer senare
            </div>
          )}

          {rows.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...hereNow, ...later].map((r) => {
                const isLater = new Date(r.arriveAt).getTime() > now;
                return (
                  <li
                    key={r.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm"
                  >
                    {isLater ? (
                      <Clock className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span className="font-semibold">{label(r.displayName, r.people)}</span>
                    {isLater && (
                      <span className="text-muted-foreground">{formatTime(r.arriveAt)}</span>
                    )}
                    {r.mine && (
                      <button
                        className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Ta bort min incheckning"
                        title="Ta bort"
                        onClick={() => remove.mutate({ id: r.id, ownerKeys: myKeys })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-2">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="Förnamn eller smeknamn (valfritt)"
            className="bg-card text-sm"
            aria-label="Namn (valfritt)"
          />
          <div className="flex items-center rounded-md border border-input bg-card" aria-label="Antal personer">
            <button
              className="px-2 py-2 text-muted-foreground disabled:opacity-40"
              onClick={() => setPeople((p) => Math.max(1, p - 1))}
              disabled={people <= 1}
              aria-label="Färre"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-bold tabular-nums">{people}</span>
            <button
              className="px-2 py-2 text-muted-foreground disabled:opacity-40"
              onClick={() => setPeople((p) => Math.min(30, p + 1))}
              disabled={people >= 30}
              aria-label="Fler"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1 font-semibold"
            disabled={create.isPending}
            onClick={() => checkIn()}
          >
            {t.here}
          </Button>
          <Button
            variant="outline"
            className="bg-card font-semibold"
            disabled={create.isPending}
            onClick={() => setPickingTime((v) => !v)}
          >
            Jag kommer…
          </Button>
        </div>
        {pickingTime && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {upcomingSlots().map((slot) => (
              <Button
                key={slot.getTime()}
                size="sm"
                variant="outline"
                className="bg-card"
                disabled={create.isPending}
                onClick={() => checkIn(slot)}
              >
                {formatTime(slot)}
              </Button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Ingen inloggning behövs. Skriv inget efternamn – bara förnamn eller
          smeknamn. Incheckningen försvinner automatiskt efter 3 timmar.
        </p>
      </div>
    </div>
  );
}
