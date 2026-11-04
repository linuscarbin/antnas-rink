import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Inbox } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

/** Small emoji per kind of notification, so the list is easy to scan. */
const TOPIC_ICON: Record<string, string> = {
  rink_plogad: "❄️",
  rink_spolad: "🧊",
  track_draget: "⛷️",
  group: "🏒",
  rink_closed: "🔴",
  duty_jobs: "🛠️",
  duty_reminder: "📅",
  snow_alert: "🌨️",
  duty_conflict: "⚠️",
  event: "📣",
};

/**
 * "Senaste notiser": everything that was sent to you (also at night, when
 * no push goes out), so you can find a förhinder or a job again.
 * Opening the list marks everything as read.
 */
export default function NotificationInbox() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.push.inbox.useQuery();
  const markAllRead = trpc.push.markAllRead.useMutation({
    onSuccess: () => utils.push.unreadCount.setData(undefined, 0),
  });
  const [, navigate] = useLocation();
  const [showAll, setShowAll] = useState(false);
  const marked = useRef(false);

  // Keep the "new" highlight for this visit, but clear the badge.
  useEffect(() => {
    if (!marked.current && data?.some((n) => n.unread)) {
      marked.current = true;
      markAllRead.mutate();
    }
  }, [data, markAllRead]);

  if (isLoading) return <Skeleton className="h-32 rounded-2xl" />;
  const items = data ?? [];
  const visible = showAll ? items : items.slice(0, 8);

  return (
    <div className="iso-card p-0">
      <h2 className="flex items-center gap-2 px-5 pb-2 pt-5 text-lg font-extrabold">
        <Inbox className="h-5 w-5 text-primary" /> Senaste notiser
      </h2>
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          Inget här än. Notiser som skickas till dig sparas här i 60 dagar – även de som kommer på natten.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visible.map((n) => {
              const clickable = Boolean(n.url);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => n.url && navigate(n.url)}
                    className={`flex w-full items-start gap-3 px-5 py-3 text-left ${
                      n.unread ? "bg-primary/5" : ""
                    } ${clickable ? "hover:bg-accent/60" : "cursor-default"}`}
                  >
                    <span className="mt-0.5 text-lg leading-none" aria-hidden>
                      {TOPIC_ICON[n.topic] ?? "🔔"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-bold">{n.title}</span>
                        {n.unread && (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                            Ny
                          </span>
                        )}
                      </span>
                      <span className="block text-sm text-muted-foreground">{n.body}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </span>
                    {clickable && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {items.length > visible.length && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full border-t border-border px-5 py-3 text-sm font-semibold text-primary"
            >
              Visa alla ({items.length})
            </button>
          )}
        </>
      )}
    </div>
  );
}
