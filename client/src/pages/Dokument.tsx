import SiteLayout from "@/components/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Download, FileText, FolderOpen } from "lucide-react";
import { useMemo } from "react";

export default function Dokument() {
  const docsQuery = trpc.documents.list.useQuery();

  const grouped = useMemo(() => {
    const m = new Map<string, NonNullable<typeof docsQuery.data>>();
    for (const d of docsQuery.data ?? []) {
      const key = d.category || "Övrigt";
      const arr = m.get(key) ?? [];
      arr.push(d);
      m.set(key, arr);
    }
    return Array.from(m.entries());
  }, [docsQuery.data]);

  return (
    <SiteLayout>
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight">Dokument</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Blanketter, policys och annat material för ledare och medlemmar. Klicka
          för att ladda ner.
        </p>

        {docsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="iso-card p-8 text-center text-muted-foreground">
            Inga dokument uppladdade ännu.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([category, docs]) => (
              <div key={category}>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {category}
                </h2>
                <div className="space-y-2">
                  {docs.map((d) => (
                    <a
                      key={d.id}
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="iso-card p-4 flex items-center gap-3 hover:border-primary/50 transition-colors"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold block truncate">{d.title}</span>
                        {d.fileName && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {d.fileName}
                          </span>
                        )}
                      </span>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
