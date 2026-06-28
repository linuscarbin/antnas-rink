import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminContacts() {
  const utils = trpc.useUtils();
  const contactsQuery = trpc.contacts.list.useQuery();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function reset() {
    setEditingId(null);
    setName("");
    setRole("");
    setPhone("");
    setEmail("");
  }

  const create = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      reset();
      toast.success("Kontakt tillagd.");
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.contacts.update.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      reset();
      toast.success("Kontakt uppdaterad.");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      toast.success("Kontakt borttagen.");
    },
    onError: (e) => toast.error(e.message),
  });

  function submit() {
    if (!name.trim() || !role.trim())
      return toast.error("Namn och roll krävs.");
    if (editingId) {
      update.mutate({ id: editingId, name, role, phone, email });
    } else {
      create.mutate({ name, role, phone, email, sortOrder: 0 });
    }
  }

  function startEdit(c: {
    id: number;
    name: string;
    role: string;
    phone: string | null;
    email: string | null;
  }) {
    setEditingId(c.id);
    setName(c.name);
    setRole(c.role);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="iso-card p-6 h-fit">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-lg">
            {editingId ? "Redigera kontakt" : "Ny kontakt"}
          </h3>
          {editingId && (
            <Button variant="ghost" size="icon" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Namn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Roll</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Huvudansvarig, Materialansvarig…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-post</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button
            className="w-full font-semibold gap-1.5"
            onClick={submit}
            disabled={create.isPending || update.isPending}
          >
            <Plus className="h-4 w-4" />
            {editingId ? "Spara ändringar" : "Lägg till"}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-2">
        {contactsQuery.isLoading ? (
          <>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </>
        ) : contactsQuery.data && contactsQuery.data.length > 0 ? (
          contactsQuery.data.map((c) => (
            <div key={c.id} className="iso-card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-extrabold">{c.name}</div>
                <div className="text-sm text-primary font-semibold">{c.role}</div>
                <div className="text-sm text-muted-foreground">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEdit(c)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => del.mutate({ id: c.id })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        ) : (
          <div className="iso-card p-8 text-center text-muted-foreground">
            Inga kontakter ännu.
          </div>
        )}
      </div>
    </div>
  );
}
