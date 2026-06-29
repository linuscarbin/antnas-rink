import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Snowflake, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";

export default function LagFamiljer() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const utils = trpc.useUtils();
  const query = trpc.bingo.teamByToken.useQuery({ token }, { retry: false });

  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [activeCount, setActiveCount] = useState("1");

  const add = trpc.bingo.addFamily.useMutation({
    onSuccess: () => {
      utils.bingo.teamByToken.invalidate({ token });
      setParentName("");
      setPhone("");
      setEmail("");
      setActiveCount("1");
      toast.success("Familj tillagd.");
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.bingo.removeFamilyByToken.useMutation({
    onSuccess: () => {
      utils.bingo.teamByToken.invalidate({ token });
      toast.success("Familj borttagen.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (query.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Skeleton className="h-64 w-full max-w-lg rounded-2xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="iso-card p-8 max-w-md">
          <h1 className="text-xl font-extrabold mb-2">Länken gäller inte</h1>
          <p className="text-muted-foreground">
            Den här lag-länken är ogiltig eller borttagen. Kontakta föreningen för
            en ny länk.
          </p>
        </div>
      </div>
    );
  }

  const { team, families } = query.data;

  function submit() {
    if (!parentName.trim()) return toast.error("Ange namn.");
    add.mutate({
      token,
      parentName: parentName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      activeCount: parseInt(activeCount, 10) || 1,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="container flex h-16 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Snowflake className="h-5 w-5" />
          </span>
          <span className="font-extrabold text-lg">
            Antnäs<span className="text-primary"> BK</span>
          </span>
        </div>
      </header>

      <div className="container py-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-extrabold tracking-tight">{team.name}</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Fyll i familjer i ert lag inför bilbingon. Ange antal aktiva barn per
          familj — arbetspassen fördelas rättvist efter det. Kontaktuppgifterna
          syns bara för föreningens administratörer.
        </p>

        <div className="iso-card p-6 mb-6">
          <h2 className="font-extrabold text-lg mb-4">Lägg till familj</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Förälderns namn</Label>
              <Input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="För- och efternamn"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="070-..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-post</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="namn@exempel.se"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Antal aktiva barn</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={activeCount}
                onChange={(e) => setActiveCount(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="mt-4 w-full font-semibold"
            onClick={submit}
            disabled={add.isPending}
          >
            Lägg till familj
          </Button>
        </div>

        <h2 className="font-extrabold text-lg mb-3">
          Familjer i laget ({families.length})
        </h2>
        {families.length === 0 ? (
          <div className="iso-card p-8 text-center text-muted-foreground">
            Inga familjer tillagda ännu.
          </div>
        ) : (
          <div className="space-y-2">
            {families.map((f) => (
              <div key={f.id} className="iso-card p-4 flex items-center gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary font-extrabold shrink-0">
                  {f.activeCount}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{f.parentName}</div>
                  <div className="text-sm text-muted-foreground">
                    {[f.phone, f.email].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ta bort"
                  onClick={() => remove.mutate({ token, id: f.id })}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
