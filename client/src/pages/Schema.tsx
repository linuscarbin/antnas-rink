import DutyWeeks from "@/components/DutyWeeks";
import SiteLayout from "@/components/SiteLayout";

export default function Schema() {
  return (
    <SiteLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Rinkjour</h1>
        <p className="mb-4 text-muted-foreground">
          Vilket lag som plogar och spolar rinken vecka för vecka.
        </p>
        <DutyWeeks area="hockeyrink" />
      </div>
    </SiteLayout>
  );
}
