import { useAuth } from "@/_core/hooks/useAuth";
import IsoDecor from "@/components/IsoDecor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { persistSessionToken } from "@/pages/Login";
import { Snowflake } from "lucide-react";
import { formatPhone } from "@shared/user";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

/**
 * /konto/<token>: invite ("Välkommen – välj lösenord") or password reset link.
 */
export default function Konto({ params }: { params: { token: string } }) {
  const token = params.token;
  const [, navigate] = useLocation();
  const { refresh } = useAuth();
  const utils = trpc.useUtils();
  const info = trpc.auth.tokenInfo.useQuery({ token }, { retry: false });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  useEffect(() => {
    if (info.data?.valid) {
      setName(info.data.name ?? "");
      setEmail(info.data.email ?? "");
    }
  }, [info.data]);

  const use = trpc.auth.useToken.useMutation({
    onSuccess: async (d) => {
      persistSessionToken(d.token);
      await utils.auth.me.invalidate();
      await refresh();
      toast.success("Klart! Du är inloggad.");
      navigate(info.data?.valid && info.data.isInvite ? "/notiser" : "/");
    },
    onError: (e) => toast.error(e.message),
  });

  const isInvite = info.data?.valid && info.data.isInvite;

  function submit() {
    if (password.length < 8) return toast.error("Lösenordet måste vara minst 8 tecken.");
    if (password !== password2) return toast.error("Lösenorden är inte lika.");
    use.mutate({
      token,
      password,
      ...(isInvite ? { name: name.trim() || undefined, email: email.trim() } : {}),
    });
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <IsoDecor />
      <div className="iso-card relative w-full max-w-md p-8">
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Snowflake className="h-5 w-5" />
          </span>
          <span className="font-extrabold text-xl tracking-tight">
            Antnäs<span className="text-primary"> Vinter</span>
          </span>
        </Link>

        {info.isLoading ? (
          <Skeleton className="h-48" />
        ) : !info.data?.valid ? (
          <div className="text-center">
            <h1 className="text-xl font-extrabold">Länken gäller inte längre</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Den har gått ut eller redan använts. Be en admin skicka en ny, eller
              använd ”Glömt lösenord” om du har e-post i ditt konto.
            </p>
            <Link href="/login">
              <Button className="mt-4">Till inloggning</Button>
            </Link>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div>
              <h1 className="text-xl font-extrabold">
                {isInvite ? `Välkommen${info.data.name ? `, ${info.data.name.split(" ")[0]}` : ""}! 👋` : "Välj nytt lösenord"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isInvite
                  ? "Välj ett lösenord så är ditt konto klart. Du loggar sedan in med ditt telefonnummer."
                  : "Välj ett nytt lösenord för ditt konto."}
              </p>
              {info.data.phone && (
                <p className="mt-2 text-sm">
                  Telefonnummer: <strong>{formatPhone(info.data.phone)}</strong>
                </p>
              )}
            </div>

            {isInvite && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Namn</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-post (valfritt – behövs för ”glömt lösenord”)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="pw">Lösenord</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minst 8 tecken"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw2">Upprepa lösenord</Label>
              <Input
                id="pw2"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={use.isPending}>
              {isInvite ? "Skapa mitt konto" : "Spara nytt lösenord"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
