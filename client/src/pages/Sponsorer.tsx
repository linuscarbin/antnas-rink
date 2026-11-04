import SiteLayout from "@/components/SiteLayout";
import { SponsorList, useSponsors } from "@/components/Sponsors";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";

export default function Sponsorer() {
  const { data, isLoading } = useSponsors();
  return (
    <SiteLayout hideSponsorStrip>
      <div className="container max-w-3xl py-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <Heart className="h-3.5 w-3.5" /> Tack!
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Våra sponsorer</h1>
        <p className="mb-5 mt-1 text-muted-foreground">
          Rinken och spåret sköts ideellt. De här gör det möjligt – stöd dem gärna tillbaka!
        </p>
        {isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : data?.length ? (
          <SponsorList sponsors={data} />
        ) : (
          <p className="text-sm text-muted-foreground">Inga sponsorer upplagda ännu.</p>
        )}
      </div>
    </SiteLayout>
  );
}
