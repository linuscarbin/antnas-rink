import GuideBody from "@/components/GuideBody";
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
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/upload";
import {
  Bold,
  Eye,
  Heading2,
  ImagePlus,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Phone,
  Save,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export type GuideArea = "publik" | "alla" | "hockeyrink" | "skidspar";

export const GUIDE_AREA_LABEL: Record<GuideArea, string> = {
  publik: "Alla besökare (Regler & info)",
  alla: "Alla jourhavare",
  hockeyrink: "Bara rinkjouren",
  skidspar: "Bara spårjouren",
};

export type GuideDraft = {
  id?: number;
  title: string;
  area: GuideArea;
  body: string;
  sortOrder: number;
};

/**
 * Simple guide editor: formatting buttons instead of markdown syntax,
 * photo upload with caption, and a preview of how it will look.
 */
export default function GuideEditor({
  draft,
  areas,
  saving,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: GuideDraft;
  /** Visibility options this user may choose. */
  areas: GuideArea[];
  saving?: boolean;
  onSave: (d: GuideDraft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState<GuideDraft>(draft);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Inserts text at the cursor (or around the selection) and keeps focus.
   * `select` marks a placeholder word (e.g. "Rubrik") so typing replaces it.
   */
  function insert(fn: (selected: string) => { text: string; select?: string }) {
    const el = textRef.current;
    const start = el?.selectionStart ?? d.body.length;
    const end = el?.selectionEnd ?? d.body.length;
    const { text, select } = fn(d.body.slice(start, end));
    const body = d.body.slice(0, start) + text + d.body.slice(end);
    setD((cur) => ({ ...cur, body }));
    const at = select ? text.indexOf(select) : -1;
    const from = at >= 0 ? start + at : start + text.length;
    const to = at >= 0 ? from + select!.length : from;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(from, to);
    });
  }

  /** Line-based helpers start on a new line. */
  const lineStart = () => {
    const el = textRef.current;
    const at = el?.selectionStart ?? d.body.length;
    return at === 0 || d.body[at - 1] === "\n" ? "" : "\n";
  };

  const tools = [
    {
      icon: Heading2,
      label: "Rubrik",
      run: () =>
        insert((sel) => ({ text: `${lineStart()}## ${sel || "Rubrik"}\n`, select: sel ? undefined : "Rubrik" })),
    },
    {
      icon: Bold,
      label: "Fet",
      run: () => insert((sel) => ({ text: `**${sel || "viktigt"}**`, select: sel ? undefined : "viktigt" })),
    },
    {
      icon: List,
      label: "Lista",
      run: () => insert((sel) => {
        const lines = (sel || "Punkt").split("\n").map((l) => `- ${l.replace(/^[-*]\s*/, "")}`);
        return { text: `${lineStart()}${lines.join("\n")}\n`, select: sel ? undefined : "Punkt" };
      }),
    },
    {
      icon: ListOrdered,
      label: "Steg",
      run: () => insert((sel) => {
        const lines = (sel || "Första steget").split("\n").map((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s*/, "")}`);
        return { text: `${lineStart()}${lines.join("\n")}\n`, select: sel ? undefined : "Första steget" };
      }),
    },
    {
      icon: Phone,
      label: "Telefon",
      run: () => {
        const name = prompt("Vem? (t.ex. Traktor – Kalle)") ?? "";
        const number = prompt("Telefonnummer") ?? "";
        if (!number.trim()) return;
        const tel = number.replace(/[^\d+]/g, "");
        insert(() => ({
          text: `${lineStart()}- ${name.trim() ? `${name.trim()}: ` : ""}[${number.trim()}](tel:${tel})\n`,
        }));
      },
    },
  ];

  async function addImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      const caption = (prompt("Bildtext (valfritt), t.ex. ”Här kopplas slangen”") ?? "").replace(/[\[\]]/g, "");
      insert(() => ({ text: `${lineStart()}![${caption.trim() || "Bild"}](${url})\n` }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdningen misslyckades.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="guide-title">Rubrik</Label>
        <Input
          id="guide-title"
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value })}
          placeholder="T.ex. Så kopplar du plogen"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Vem ska se den?</Label>
        <Select value={d.area} onValueChange={(v) => setD({ ...d, area: v as GuideArea })}>
          <SelectTrigger className="bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {GUIDE_AREA_LABEL[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Innehåll</Label>
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${!preview ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Pencil className="h-3 w-3" /> Skriv
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${preview ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Eye className="h-3 w-3" /> Förhandsvisa
            </button>
          </div>
        </div>

        {preview ? (
          <div className="min-h-48 rounded-md border border-border bg-card p-4">
            {d.title && <h3 className="mb-2 text-lg font-extrabold">{d.title}</h3>}
            {d.body.trim() ? (
              <GuideBody body={d.body} />
            ) : (
              <p className="text-sm text-muted-foreground">Inget innehåll ännu.</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
              {tools.map((t) => (
                <Button
                  key={t.label}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-xs"
                  onClick={t.run}
                  title={t.label}
                >
                  <t.icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 px-2 text-xs text-primary"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                title="Lägg till bild"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                <span>Bild</span>
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addImage(f);
                  e.target.value = "";
                }}
              />
            </div>
            <Textarea
              ref={textRef}
              value={d.body}
              onChange={(e) => setD({ ...d, body: e.target.value })}
              rows={12}
              placeholder="Skriv här. Använd knapparna ovanför för rubriker, listor, telefonnummer och bilder."
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tips: skriv koder som text, inte i bilder – bilder kan nås av den som har länken.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            if (!d.title.trim()) return toast.error("Skriv en rubrik.");
            onSave(d);
          }}
          disabled={saving || uploading}
          className="gap-1.5"
        >
          <Save className="h-4 w-4" /> Spara
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Avbryt
        </Button>
        {onDelete && (
          <Button variant="ghost" className="ml-auto gap-1.5 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Ta bort
          </Button>
        )}
      </div>
    </div>
  );
}
