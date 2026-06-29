import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import {
  Check,
  Download,
  ImagePlus,
  Loader2,
  Receipt,
  Trash2,
  Wrench,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Area = "hockeyrink" | "skidspar";

const PAYMENT_LABEL: Record<string, string> = {
  tankkort_abk: "Tankkort (ABK)",
  egen: "Egen betalning",
};

export default function ExpenseSection({ area }: { area: Area }) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const listQuery = trpc.expenses.list.useQuery({ area });
  const summaryQuery = trpc.expenses.summary.useQuery({ area });

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [payment, setPayment] = useState<"tankkort_abk" | "egen">("egen");
  const [note, setNote] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    utils.expenses.list.invalidate();
    utils.expenses.summary.invalidate();
  };

  const create = trpc.expenses.create.useMutation({
    onSuccess: () => {
      invalidate();
      setAmount("");
      setCategory("");
      setNote("");
      setReceiptUrl(null);
      setPayment("egen");
      toast.success("Utlägg registrerat.");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success("Utlägg borttaget.");
    },
    onError: (e) => toast.error(e.message),
  });
  const setReimbursed = trpc.expenses.setReimbursed.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success("Återbetalningsstatus uppdaterad.");
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Endast bilder.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Bilden är för stor (max 8 MB).");
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
      setReceiptUrl(d.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdning misslyckades.");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    const amountSek = parseFloat(amount.replace(",", "."));
    if (!amountSek || amountSek <= 0) return toast.error("Ange ett belopp.");
    create.mutate({
      area,
      amountSek,
      category: category || undefined,
      paymentMethod: payment,
      note: note || undefined,
      receiptUrl: receiptUrl || undefined,
    });
  }

  const periodQs = `${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;
  const exportCsv = `/api/expenses/export.csv?area=${area}${periodQs}`;
  const exportZip = `/api/expenses/receipts.zip?area=${area}${periodQs}`;

  return (
    <div className="container pb-12">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-extrabold tracking-tight">Övriga utlägg</h2>
      </div>
      <p className="text-muted-foreground mb-5">
        Reservdelar, material, verktyg m.m. Spara kvitto och få allt nedladdningsbart
        för revision.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="iso-card p-6 lg:sticky lg:top-24">
            {isAuthenticated ? (
              <div className="space-y-4">
                <h3 className="font-extrabold text-lg">Nytt utlägg</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Belopp (kr)</Label>
                    <Input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="350"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kategori</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Reservdelar"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Betalsätt</Label>
                  <Select
                    value={payment}
                    onValueChange={(v) => setPayment(v as "tankkort_abk" | "egen")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="egen">
                        Egen betalning (vill ha tillbaka)
                      </SelectItem>
                      <SelectItem value="tankkort_abk">
                        Föreningens kort (ABK)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Notering (valfritt)</Label>
                  <Textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Kvitto (foto/skanna)</Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                  {receiptUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={receiptUrl}
                        alt="Kvitto"
                        className="max-h-32 rounded-lg border border-border"
                      />
                      <button
                        onClick={() => setReceiptUrl(null)}
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                        aria-label="Ta bort"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full bg-card gap-1.5"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      Lägg till kvittobild
                    </Button>
                  )}
                </div>
                <Button
                  className="w-full font-semibold"
                  onClick={submit}
                  disabled={create.isPending}
                >
                  Registrera utlägg
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground">
                Logga in för att registrera utlägg.{" "}
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

        {/* List + summary + export */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="iso-card p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Antal
              </div>
              <div className="text-2xl font-extrabold">
                {summaryQuery.data?.count ?? "—"}
              </div>
            </div>
            <div className="iso-card p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Totalt (säsong)
              </div>
              <div className="text-2xl font-extrabold">
                {summaryQuery.data
                  ? `${summaryQuery.data.totalSek.toLocaleString("sv-SE")} kr`
                  : "—"}
              </div>
            </div>
            <div className="iso-card p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Att återbetala
              </div>
              <div className="text-2xl font-extrabold text-destructive">
                {summaryQuery.data
                  ? `${summaryQuery.data.toReimburseSek.toLocaleString("sv-SE")} kr`
                  : "—"}
              </div>
            </div>
          </div>

          <div className="iso-card p-4 mb-4">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Export för revision
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Från (valfritt)</Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Till (valfritt)</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9"
                />
              </div>
              <a href={exportCsv}>
                <Button variant="outline" size="sm" className="bg-card gap-1.5">
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </a>
              <a href={exportZip}>
                <Button variant="outline" size="sm" className="bg-card gap-1.5">
                  <Receipt className="h-4 w-4" /> Kvitton (ZIP)
                </Button>
              </a>
            </div>
          </div>

          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : listQuery.data && listQuery.data.length > 0 ? (
            <div className="space-y-2">
              {listQuery.data.map((r) => {
                const mine = user && r.userId === user.id;
                const canDelete = mine || user?.role === "admin";
                return (
                  <div key={r.id} className="iso-card p-4 flex items-center gap-4">
                    {r.receiptUrl ? (
                      <a href={r.receiptUrl} target="_blank" rel="noreferrer">
                        <img
                          src={r.receiptUrl}
                          alt="Kvitto"
                          className="h-12 w-12 rounded-lg object-cover border border-border"
                        />
                      </a>
                    ) : (
                      <span className="grid h-12 w-12 place-items-center rounded-lg bg-muted text-muted-foreground shrink-0">
                        <Receipt className="h-5 w-5" />
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold">
                        {(r.amountOre / 100).toLocaleString("sv-SE")} kr
                        {r.category && (
                          <span className="text-muted-foreground font-normal">
                            {" "}· {r.category}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(r.purchasedAt)} · {r.responsibleName} ·{" "}
                        {PAYMENT_LABEL[r.paymentMethod]}
                      </div>
                      {r.note && (
                        <div className="text-sm text-muted-foreground">{r.note}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.paymentMethod === "egen" && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            r.reimbursed
                              ? "bg-primary/15 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {r.reimbursed ? "Återbetald" : "Ej återbetald"}
                        </span>
                      )}
                      {user?.role === "admin" && r.paymentMethod === "egen" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Markera återbetald"
                          onClick={() =>
                            setReimbursed.mutate({
                              id: r.id,
                              reimbursed: !r.reimbursed,
                            })
                          }
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ta bort"
                          onClick={() => del.mutate({ id: r.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="iso-card p-8 text-center text-muted-foreground">
              Inga övriga utlägg registrerade ännu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
