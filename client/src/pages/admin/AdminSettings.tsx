import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bell, StickyNote } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Map a simple weekday/time picker to a 6-field UTC cron.
function buildCron(weekday: number, hour: number) {
  // sec min hour dom mon dow  (UTC)
  return `0 0 ${hour} * * ${weekday}`;
}

export default function AdminSettings() {
  const utils = trpc.useUtils();
  const statusQuery = trpc.status.get.useQuery();
  const scheduleQuery = trpc.schedule.get.useQuery();

  const [note, setNote] = useState("");
  useEffect(() => {
    if (statusQuery.data) setNote(statusQuery.data.note ?? "");
  }, [statusQuery.data]);

  const [weekday, setWeekday] = useState(1); // Monday
  const [hour, setHour] = useState(6); // 06:00 UTC ~ 07/08 svensk tid

  const setNoteMut = trpc.status.setNote.useMutation({
    onSuccess: () => {
      utils.status.get.invalidate();
      toast.success("Notering sparad.");
    },
    onError: (e) => toast.error(e.message),
  });
  const setReminder = trpc.schedule.setReminder.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Påminnelse aktiverad.");
    },
    onError: (e) => toast.error(e.message),
  });
  const disableReminder = trpc.schedule.disableReminder.useMutation({
    onSuccess: () => {
      utils.schedule.get.invalidate();
      toast.success("Påminnelse avstängd.");
    },
    onError: (e) => toast.error(e.message),
  });

  const reminderOn = scheduleQuery.data?.enabled;
  const weekdays = [
    { v: 1, l: "Måndag" },
    { v: 2, l: "Tisdag" },
    { v: 3, l: "Onsdag" },
    { v: 4, l: "Torsdag" },
    { v: 5, l: "Fredag" },
    { v: 6, l: "Lördag" },
    { v: 0, l: "Söndag" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
      <div className="iso-card p-6">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          <h3 className="font-extrabold text-lg">Notering på statussidan</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Visas för alla besökare, t.ex. "Plogen trasig" eller "Öppen åkning
          ikväll".
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          className="mt-3 font-semibold"
          onClick={() => setNoteMut.mutate({ note })}
          disabled={setNoteMut.isPending}
        >
          Spara notering
        </Button>
      </div>

      <div className="iso-card p-6">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-extrabold text-lg">Jourpåminnelse via e-post</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Skickar automatiskt e-post till veckans plog- och spoljour (de som är
          kopplade som medlem).
        </p>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border/70 p-3">
          <span className="font-semibold">
            {reminderOn ? "Påminnelse är aktiv" : "Påminnelse är avstängd"}
          </span>
          <Switch
            checked={Boolean(reminderOn)}
            onCheckedChange={(checked) => {
              if (checked) {
                setReminder.mutate({ cron: buildCron(weekday, hour) });
              } else {
                disableReminder.mutate();
              }
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Veckodag</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
            >
              {weekdays.map((w) => (
                <option key={w.v} value={w.v}>
                  {w.l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Timme (UTC)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-3 w-full bg-card font-semibold"
          onClick={() => setReminder.mutate({ cron: buildCron(weekday, hour) })}
          disabled={setReminder.isPending}
        >
          {reminderOn ? "Uppdatera tidpunkt" : "Aktivera påminnelse"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Obs: kräver att appen är driftsatt och att Resend är konfigurerat.
          Tider anges i UTC (svensk tid är UTC+1/+2).
        </p>
      </div>
    </div>
  );
}
