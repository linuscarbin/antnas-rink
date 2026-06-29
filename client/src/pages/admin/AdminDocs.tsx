import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function AdminDocs() {
  const utils = trpc.useUtils();
  const docsQuery = trpc.documents.list.useQuery();
  const infoQuery = trpc.settings.getBingoInfo.useQuery();

  // --- Bilbingo info editor ---
  const [info, setInfo] = useState("");
  useEffect(() => {
    if (infoQuery.data?.text != null) setInfo(infoQuery.data.text);
  }, [infoQuery.data?.text]);
  const saveInfo = trpc.settings.setBingoInfo.useMutation({
    onSuccess: () => {
      utils.settings.getBingoInfo.invalidate();
      toast.success("Bilbingo-info sparad.");
    },
    onError: (e) => toast.error(e.message),
  });

  // --- Document upload ---
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createDoc = trpc.documents.create.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      setTitle("");
      setCategory("");
      toast.success("Dokument tillagt.");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      toast.success("Dokument borttaget.");
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleFile(file: File) {
    if (!title.trim()) {
      toast.error("Ange en titel först.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch("/api/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d.error || "Uppladdning misslyckades.");
      }
      const d = (await resp.json()) as { url: string };
      createDoc.mutate({
        title: title.trim(),
        category: category.trim() || undefined,
        fileUrl: d.url,
        fileName: file.name,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdning misslyckades.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Bilbingo info */}
      <div className="iso-card p-6">
        <h3 className="font-extrabold text-lg mb-1">Bilbingo-information</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Visas på bilbingosidan under "Allt du behöver veta". Stödjer enkel
          formatering (markdown) — t.ex. **fet text** och punktlistor.
        </p>
        {infoQuery.isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <>
            <Textarea
              rows={10}
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder={"### Höga vinster!\nTotalt vinstvärde 86 000 kr...\n\n- Block 50 kr\n- Freeplay 30 kr\n- Endast kontant betalning\n- Radiofrekvens 92.3 MHz\n- Hamburgare, fika, kaffe till försäljning"}
              className="font-mono text-sm"
            />
            <Button
              className="mt-3 font-semibold gap-1.5"
              onClick={() => saveInfo.mutate({ text: info })}
              disabled={saveInfo.isPending}
            >
              <Save className="h-4 w-4" /> Spara info
            </Button>
          </>
        )}
      </div>

      {/* Documents */}
      <div className="iso-card p-6">
        <h3 className="font-extrabold text-lg mb-1">Dokument</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ladda upp blanketter, policys och annat för ledare och medlemmar.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Titel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="T.ex. Reseräkning 2026"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori (valfritt)</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="T.ex. Blanketter"
            />
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          className="mt-3 bg-card gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Ladda upp fil
        </Button>

        <div className="mt-4 space-y-2">
          {docsQuery.isLoading ? (
            <Skeleton className="h-12 rounded-xl" />
          ) : (docsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga dokument ännu.</p>
          ) : (
            (docsQuery.data ?? []).map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold block truncate">{d.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.category || "Övrigt"}
                  </span>
                </span>
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary font-semibold">
                  Öppna
                </a>
                <Button variant="ghost" size="icon" aria-label="Ta bort" onClick={() => deleteDoc.mutate({ id: d.id })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
