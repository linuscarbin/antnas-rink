import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { trpc } from "@/lib/trpc";
import { ScrollText } from "lucide-react";
import { lazy, Suspense } from "react";

// The markdown renderer is heavy – load it when the sheet opens.
const GuideBody = lazy(() => import("@/components/GuideBody"));

type Area = "hockeyrink" | "skidspar";

type Guide = { id: number; title: string; body: string };

/**
 * Picks the public guide holding the rules for a hub: a public guide whose
 * title mentions "ordningsregler" (or "regler"), preferring one that names
 * the area (rink vs spår).
 */
export function pickRules(guides: Guide[], area: Area): Guide | undefined {
  const rules = guides.filter((g) => /regler/i.test(g.title));
  const own = area === "hockeyrink" ? /rink/i : /spår|spar|skid/i;
  const other = area === "hockeyrink" ? /spår|spar|skid/i : /rink/i;
  return (
    rules.find((g) => own.test(g.title)) ??
    rules.find((g) => !other.test(g.title) && /ordningsregl/i.test(g.title)) ??
    rules.find((g) => !other.test(g.title))
  );
}

/** Prominent button that opens the hub's ordningsregler in a bottom sheet. */
export default function RulesButton({ area }: { area: Area }) {
  const { data } = trpc.guides.publicList.useQuery(undefined, { staleTime: 5 * 60_000 });
  const rules = data ? pickRules(data as Guide[], area) : undefined;
  if (!rules) return null;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-card px-4 py-2 text-sm font-bold text-primary shadow-sm transition hover:bg-primary hover:text-primary-foreground">
          <ScrollText className="h-4 w-4" /> Ordningsregler
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="flex items-center gap-2 text-xl font-extrabold">
              <ScrollText className="h-5 w-5 text-primary" /> {rules.title}
            </DrawerTitle>
          </DrawerHeader>
          <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" />}>
            <GuideBody body={rules.body} />
          </Suspense>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
