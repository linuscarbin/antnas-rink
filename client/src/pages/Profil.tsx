import { useAuth } from "@/_core/hooks/useAuth";
import SiteLayout from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Profil() {
  const { user, loading, refresh } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const update = trpc.users.updateMe.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Profil sparad.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!loading && !user) {
    return (
      <SiteLayout>
        <div className="container py-12 text-center text-muted-foreground">
          Du måste vara inloggad för att se din profil.
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container py-8 max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight">Min profil</h1>
        <p className="text-muted-foreground">
          Ditt namn och telefonnummer visas när du har jour och används för
          påminnelser.
        </p>
        <div className="iso-card p-6 mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Namn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="070-123 45 67"
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-post</Label>
            <Input value={user?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">
              E-post hanteras via din inloggning.
            </p>
          </div>
          <Button
            className="w-full font-semibold"
            onClick={() => update.mutate({ name, phone })}
            disabled={update.isPending}
          >
            Spara
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
