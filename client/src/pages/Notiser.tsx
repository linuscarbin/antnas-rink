import { useAuth } from "@/_core/hooks/useAuth";
import NotificationInbox from "@/components/NotificationInbox";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  canPromptInstall,
  currentSubscription,
  ensureSubscription,
  isAndroid,
  isIos,
  isStandalone,
  onInstallPromptChange,
  promptInstall,
  pushSupported,
  subscriptionPayload,
} from "@/lib/push";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_FUNCTIONARY_TOPICS,
  DEFAULT_PUBLIC_TOPICS,
  DUTY_TOPICS,
  PUBLIC_TOPICS,
  TOPIC_INFO,
  type PushTopic,
} from "@shared/push";
import { Bell, BellOff, Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";


export default function Notiser() {
  const { isRinkFunctionary, isTrackFunctionary, isAuthenticated } = useAuth();
  const isFunctionary = isRinkFunctionary || isTrackFunctionary;
  const keyQuery = trpc.push.publicKey.useQuery(undefined, { enabled: pushSupported() });
  const subscribe = trpc.push.subscribe.useMutation();
  const unsubscribe = trpc.push.unsubscribe.useMutation();
  const test = trpc.push.test.useMutation();
  const utils = trpc.useUtils();

  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [topics, setTopics] = useState<PushTopic[]>(DEFAULT_PUBLIC_TOPICS);
  const [busy, setBusy] = useState(false);
  const [installable, setInstallable] = useState(canPromptInstall());
  useEffect(() => onInstallPromptChange(() => setInstallable(canPromptInstall())), []);

  // Load this device's current subscription + topics.
  useEffect(() => {
    (async () => {
      try {
        const sub = await currentSubscription();
        if (sub) {
          setEndpoint(sub.endpoint);
          const mine = await utils.push.mine.fetch({ endpoint: sub.endpoint });
          if (mine.subscribed) setTopics(mine.topics);
          else setEndpoint(null);
        }
      } catch {
        // ignore – treated as not subscribed
      } finally {
        setChecking(false);
      }
    })();
  }, [utils]);

  // Functionaries get duty topics (and not "ett gäng är på väg")
  // pre-selected the first time; they can change it.
  useEffect(() => {
    if (isFunctionary && !endpoint) setTopics(DEFAULT_FUNCTIONARY_TOPICS);
  }, [isFunctionary, endpoint]);

  const supported = pushSupported();
  const ios = isIos();
  const standalone = isStandalone();
  const needsInstallFirst = ios && !standalone; // iPhone: push only in installed app
  const denied = supported && Notification.permission === "denied";

  function toggle(t: PushTopic, on: boolean) {
    setTopics((cur) => (on ? Array.from(new Set([...cur, t])) : cur.filter((x) => x !== t)));
  }

  async function save() {
    if (!keyQuery.data) return;
    setBusy(true);
    try {
      const sub = await ensureSubscription(keyQuery.data.publicKey);
      const res = await subscribe.mutateAsync({ subscription: subscriptionPayload(sub), topics });
      setEndpoint(sub.endpoint);
      setTopics(res.topics);
      toast.success(endpoint ? "Dina val är sparade." : "Notiser är påslagna!");
      if (!endpoint) test.mutate({ endpoint: sub.endpoint });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte slå på notiser.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await unsubscribe.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setEndpoint(null);
      toast.success("Notiser avstängda.");
    } finally {
      setBusy(false);
    }
  }

  const visibleTopics: PushTopic[] = [...PUBLIC_TOPICS, ...(isFunctionary ? DUTY_TOPICS : [])];

  return (
    <SiteLayout>
      <section className="border-b border-border/60">
        <div className="container py-8 sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Bell className="h-3.5 w-3.5" /> App &amp; notiser
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">Notiser</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Få en notis i telefonen när rinken är plogad eller nyspolad, eller när
            ett gäng är på väg. Inget konto behövs. Inga notiser mellan 22 och 07.
          </p>
        </div>
      </section>

      <div className="container py-6 grid gap-6 max-w-2xl">
        {isAuthenticated && <NotificationInbox />}

        {/* Install */}
        {!standalone && (
          <div className="iso-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Download className="h-5 w-5 text-primary" /> Lägg appen på hemskärmen
            </h2>
            {ios ? (
              <ol className="mt-3 space-y-2 text-sm">
                <li>
                  1. Öppna sidan i <strong>Safari</strong>.
                </li>
                <li className="flex flex-wrap items-center gap-1">
                  2. Tryck på <Share className="inline h-4 w-4" /> <strong>Dela</strong> längst ner.
                </li>
                <li className="flex flex-wrap items-center gap-1">
                  3. Välj <SquarePlus className="inline h-4 w-4" /> <strong>Lägg till på hemskärmen</strong>.
                </li>
                <li>
                  4. Öppna <strong>Antnäs Vinter</strong> från hemskärmen och kom tillbaka hit
                  (Mer → Notiser) för att slå på notiser.
                </li>
              </ol>
            ) : installable ? (
              <div className="mt-3">
                <Button onClick={() => promptInstall()} className="gap-1.5">
                  <Download className="h-4 w-4" /> Installera appen
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {isAndroid()
                  ? "Öppna menyn (⋮) i Chrome och välj ”Installera app” eller ”Lägg till på startskärmen”."
                  : "I Chrome eller Edge: klicka på installera-ikonen i adressfältet."}
              </p>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="iso-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Bell className="h-5 w-5 text-primary" /> Vad vill du få notis om?
          </h2>

          {checking ? (
            <Skeleton className="mt-4 h-40" />
          ) : needsInstallFirst ? (
            <p className="mt-3 text-sm text-muted-foreground">
              På iPhone fungerar notiser när appen ligger på hemskärmen (iOS 16.4
              eller senare). Följ stegen ovan först.
            </p>
          ) : !supported ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Den här webbläsaren stödjer inte notiser. Prova Chrome, Edge,
              Firefox eller Safari.
            </p>
          ) : denied ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Notiser är blockerade för den här sidan. Tillåt notiser för
              Antnäs Vinter i telefonens/webbläsarens inställningar och ladda om sidan.
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-3">
                {visibleTopics.map((t, i) => (
                  <label key={t} className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={topics.includes(t)}
                      onCheckedChange={(v) => toggle(t, v === true)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-semibold">{TOPIC_INFO[t].label}</span>
                      {i === PUBLIC_TOPICS.length && (
                        <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                          Jour
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground">{TOPIC_INFO[t].hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={save} disabled={busy || !keyQuery.data || topics.length === 0} className="gap-1.5">
                  <Bell className="h-4 w-4" />
                  {endpoint ? "Spara val" : "Slå på notiser"}
                </Button>
                {endpoint && (
                  <>
                    <Button
                      variant="outline"
                      className="bg-card"
                      disabled={busy}
                      onClick={() =>
                        test.mutate(
                          { endpoint },
                          { onSuccess: (r) => (r.sent ? toast.success("Testnotis skickad.") : toast.error("Kunde inte skicka.")) }
                        )
                      }
                    >
                      Skicka testnotis
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={turnOff} className="gap-1.5">
                      <BellOff className="h-4 w-4" /> Stäng av
                    </Button>
                  </>
                )}
              </div>
              {endpoint && (
                <p className="mt-3 text-xs text-muted-foreground">✅ Notiser är på för den här enheten.</p>
              )}
              {!isFunctionary && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Har du jour? Logga in först, så kan du även få jourpåminnelser och snövarningar.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
