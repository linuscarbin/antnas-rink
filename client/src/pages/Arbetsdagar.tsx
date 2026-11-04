import EventsBoard from "@/components/EventsBoard";
import SiteLayout from "@/components/SiteLayout";
import { Hammer } from "lucide-react";

export default function Arbetsdagar() {
  return (
    <SiteLayout>
      <div className="container max-w-3xl py-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <Hammer className="h-3.5 w-3.5" /> Vi hjälps åt
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Arbetsdagar</h1>
        <p className="mb-5 mt-1 text-muted-foreground">
          Fix på rinken, röjning längs spåret och annat vi gör tillsammans. Svara
          om du kan komma – alla händer behövs!
        </p>
        <EventsBoard />
      </div>
    </SiteLayout>
  );
}
