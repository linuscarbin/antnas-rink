import SiteLayout from "@/components/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ChevronDown, Info as InfoIcon } from "lucide-react";
import { Streamdown } from "streamdown";

/** Public rules & tips: ordningsregler, ställa bort målen, var snön ska ligga… */
export default function Info() {
  const q = trpc.guides.publicList.useQuery();
  const guides = q.data ?? [];
  return (
    <SiteLayout>
      <section className="border-b border-border/60">
        <div className="container py-8 sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <InfoIcon className="h-3.5 w-3.5" /> För alla
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Regler &amp; info
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Allt sköts ideellt av byborna. Hjälp till genom att följa reglerna
            nedan – då blir det bättre is för alla.
          </p>
        </div>
      </section>
      <div className="container py-6 max-w-3xl">
        {q.isLoading ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : guides.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen information upplagd ännu.</p>
        ) : (
          <div className="grid gap-2">
            {guides.map((g, i) => (
              <details key={g.id} className="iso-card group p-0" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 font-bold">
                  {g.title}
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="prose prose-sm max-w-none px-5 pb-5">
                  <Streamdown>{g.body}</Streamdown>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
