import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload";
import { Camera, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/** Small "Bifoga foto" control: uploads immediately and reports the URL. */
export default function PhotoPicker({
  value,
  onChange,
  label = "Bifoga foto",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File) {
    setBusy(true);
    try {
      onChange(await uploadFile(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdning misslyckades.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {value ? (
        <div className="relative">
          <img src={value} alt="Valt foto" className="h-12 w-16 rounded-md object-cover border border-border" />
          <button
            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background"
            aria-label="Ta bort foto"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="bg-card gap-1.5"
          disabled={busy}
          onClick={() => ref.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {label}
        </Button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
