import { useAuth } from "@/_core/hooks/useAuth";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, MessageSquare, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function Anslagstavla() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const messagesQuery = trpc.chat.list.useQuery(undefined, {
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = messagesQuery.data?.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [count]);

  const post = trpc.chat.post.useMutation({
    onSuccess: () => {
      setText("");
      setImageUrl(null);
      utils.chat.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.chat.remove.useMutation({
    onSuccess: () => utils.chat.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Endast bilder kan bifogas.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Bilden är för stor (max 8 MB).");
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
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Uppladdning misslyckades.");
      }
      const data = (await resp.json()) as { url: string };
      setImageUrl(data.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdning misslyckades.");
    } finally {
      setUploading(false);
    }
  }

  function send() {
    const content = text.trim();
    if (!content && !imageUrl) return;
    post.mutate({ content, imageUrl });
  }

  return (
    <SiteLayout>
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight">Anslagstavla</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Gemensam tråd för hela Antnäs Vinter — rinken och skidspåret. Alla kan
          läsa, inloggade kan skriva och dela bilder.
        </p>

        <div className="iso-card p-4 sm:p-6">
          {messagesQuery.isError && (
            <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Kunde inte hämta meddelanden just nu. Försöker igen automatiskt.
            </div>
          )}
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {messagesQuery.isLoading ? (
              <>
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </>
            ) : count > 0 ? (
              messagesQuery.data!.map((m) => {
                const mine = user && m.userId === user.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`group relative max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <div className="text-xs font-bold opacity-80 mb-0.5">
                        {m.authorName}
                      </div>
                      {m.imageUrl && (
                        <a
                          href={m.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block mb-1.5"
                        >
                          <img
                            src={m.imageUrl}
                            alt="Bifogad bild"
                            loading="lazy"
                            className="max-h-72 w-auto rounded-lg object-cover"
                          />
                        </a>
                      )}
                      {m.content && (
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {m.content}
                        </div>
                      )}
                      {user?.role === "admin" && (
                        <button
                          onClick={() => remove.mutate({ id: m.id })}
                          className="absolute -right-2 -top-2 hidden rounded-full bg-destructive p-1 text-destructive-foreground group-hover:block"
                          aria-label="Ta bort"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Inga inlägg ännu. Skriv det första!
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="mt-4 border-t border-border/60 pt-4">
            {isAuthenticated ? (
              <>
                {imageUrl && (
                  <div className="relative mb-2 inline-block">
                    <img
                      src={imageUrl}
                      alt="Förhandsvisning"
                      className="max-h-40 rounded-lg"
                    />
                    <button
                      onClick={() => setImageUrl(null)}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                      aria-label="Ta bort bild"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 bg-card"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    aria-label="Bifoga bild"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </Button>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    placeholder="Skriv ett meddelande…"
                    className="resize-none"
                  />
                  <Button
                    onClick={send}
                    disabled={post.isPending || (!text.trim() && !imageUrl)}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label="Skicka"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground text-center">
                Logga in för att skriva och dela bilder.{" "}
                <button
                  className="font-semibold text-primary underline"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Logga in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
