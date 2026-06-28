import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Bell, StickyNote } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const utils = trpc.useUtils();
  const statusQuery = trpc.status.get.useQuery();
  const scheduleQuery = trpc.schedule.get.useQuery();

  const [note, setNote] = useState("");
  useEffect(() => {
    if (statusQuery.data) setNote(statusQuery.data.note ?? "");
  }, [statusQuery.data]);

  const setNoteMut = trpc.status.setNote.useMutation({
    onSuccess: () => {
      utils.status.get.invalidate();
      toast.success("Notering sparad.");
    },
    onError: (e) => toast.error(e.message),
  });
  const runNow = trpc.schedule.runNow.useMutation({
    onSuccess: (r) => {
      toast.success(
        r.sent > 0
          ? `Skickade ${r.sent} påminnelse(r).`
          : "Inga mottagare att påminna denna vecka."
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const reminderOn = scheduleQuery.data?.enabled;
  const cronExpr = scheduleQuery.data?.cron;

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
          Servern skickar automatiskt e-post till veckans plog- och spoljour (de
          som är kopplade som medlem med e-post).
        </p>

        <div className="mt-4 rounded-lg border border-border/70 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Status</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                reminderOn
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {reminderOn ? "Aktiv" : "Avstängd"}
            </span>
          </div>
          <div className="mt-2 text-muted-foreground">
            Schema styrs av miljövariabeln{" "}
            <code className="rounded bg-muted px-1 py-0.5">DUTY_REMINDER_CRON</code>{" "}
            i Coolify.
            {cronExpr ? (
              <>
                {" "}Nuvarande: <code className="rounded bg-muted px-1 py-0.5">{cronExpr}</code>{" "}
                (serverns tidszon).
              </>
            ) : null}
          </div>
        </div>

        <Button
          variant="outline"
          className="mt-3 w-full bg-card font-semibold"
          onClick={() => runNow.mutate()}
          disabled={runNow.isPending}
        >
          Skicka påminnelse nu (denna vecka)
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Kräver att Resend (RESEND_API_KEY) är konfigurerat. Standard:
          måndagar 07:00 serverns tid.
        </p>
      </div>
    </div>
  );
}
