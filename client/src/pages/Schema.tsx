import { useAuth } from "@/_core/hooks/useAuth";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { getIsoWeek } from "@shared/rink";
import { AlertTriangle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Schema() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [now] = useState(() => new Date());
  const current = getIsoWeek(now);
  const [year, setYear] = useState(current.year);
  const dutyQuery = trpc.duty.list.useQuery({ year });

  const flag = trpc.duty.flagConflict.useMutation({
    onSuccess: () => {
      utils.duty.list.invalidate();
      toast.success("Förhinder anmält. Admin har meddelats.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <div className="container py-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Jourschema</h1>
            <p className="text-muted-foreground">
              Plogjour och spoljour vecka för vecka.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-card"
              onClick={() => setYear((y) => y - 1)}
            >
              {year - 1}
            </Button>
            <span className="font-extrabold text-lg w-14 text-center">{year}</span>
            <Button
              variant="outline"
              size="sm"
              className="bg-card"
              onClick={() => setYear((y) => y + 1)}
            >
              {year + 1}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {dutyQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          ) : dutyQuery.data && dutyQuery.data.length > 0 ? (
            dutyQuery.data.map((d) => {
              const isCurrent = year === current.year && d.week === current.week;
              const myPlog = user && d.plogjourUserId === user.id;
              const mySpol = user && d.spoljourUserId === user.id;
              return (
                <div
                  key={d.id}
                  className={`iso-card p-5 ${
                    isCurrent ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary font-extrabold">
                      v{d.week}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                        Denna vecka
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DutyBlock
                      label="Plogjour"
                      name={d.plogjourName}
                      phone={d.plogjourPhone}
                      conflict={d.plogjourConflict}
                      canFlag={Boolean(myPlog)}
                      onFlag={() =>
                        flag.mutate({
                          id: d.id,
                          kind: "plogjour",
                          conflict: !d.plogjourConflict,
                        })
                      }
                      pending={flag.isPending}
                    />
                    <DutyBlock
                      label="Spoljour"
                      name={d.spoljourName}
                      phone={d.spoljourPhone}
                      conflict={d.spoljourConflict}
                      canFlag={Boolean(mySpol)}
                      onFlag={() =>
                        flag.mutate({
                          id: d.id,
                          kind: "spoljour",
                          conflict: !d.spoljourConflict,
                        })
                      }
                      pending={flag.isPending}
                    />
                  </div>
                  {d.note && (
                    <p className="mt-3 text-sm text-muted-foreground">{d.note}</p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="iso-card p-8 text-center text-muted-foreground">
              Inget schema inlagt för {year} ännu.
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

function DutyBlock({
  label,
  name,
  phone,
  conflict,
  canFlag,
  onFlag,
  pending,
}: {
  label: string;
  name: string | null;
  phone: string | null;
  conflict: boolean;
  canFlag: boolean;
  onFlag: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/40 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2 font-semibold">
        {name || "—"}
        {conflict && (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">
            Förhinder
          </span>
        )}
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <Phone className="h-3.5 w-3.5" /> {phone}
        </a>
      )}
      {canFlag && (
        <Button
          variant={conflict ? "outline" : "ghost"}
          size="sm"
          className="mt-2 w-full gap-1.5 bg-card"
          onClick={onFlag}
          disabled={pending}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {conflict ? "Ta bort förhinder" : "Anmäl förhinder"}
        </Button>
      )}
    </div>
  );
}
