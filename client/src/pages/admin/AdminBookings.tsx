import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ZONE_LABELS, type Zone } from "@shared/rink";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminBookings() {
  const utils = trpc.useUtils();
  const [fromTime] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const bookingsQuery = trpc.bookings.list.useQuery({ fromTime });
  const cancel = trpc.bookings.adminCancel.useMutation({
    onSuccess: () => {
      utils.bookings.list.invalidate();
      toast.success("Bokning avbokad.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-2 max-w-3xl">
      {bookingsQuery.isLoading ? (
        <>
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </>
      ) : bookingsQuery.data && bookingsQuery.data.length > 0 ? (
        bookingsQuery.data.map((b) => (
          <div key={b.id} className="iso-card p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-extrabold truncate">{b.title}</div>
              <div className="text-sm text-muted-foreground">
                {formatDateTime(b.startTime)} · {ZONE_LABELS[b.zone as Zone]}
                {b.bookedByName ? ` · ${b.bookedByName}` : ""}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => cancel.mutate({ id: b.id })}
              aria-label="Avboka"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))
      ) : (
        <div className="iso-card p-8 text-center text-muted-foreground">
          Inga kommande bokningar.
        </div>
      )}
    </div>
  );
}
