import { useAuth } from "@/_core/hooks/useAuth";
import IsoDecor from "@/components/IsoDecor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Snowflake } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type Mode = "login" | "register" | "forgot";

export function persistSessionToken(token?: string) {
  try {
    if (token) sessionStorage.setItem("session-token", token);
  } catch {
    // ignore (private mode)
  }
}

export default function Login() {
  const { isAuthenticated, refresh } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("login");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [resetSent, setResetSent] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const onLoggedIn = async (token: string | undefined, msg: string) => {
    persistSessionToken(token);
    await utils.auth.me.invalidate();
    await refresh();
    toast.success(msg);
    navigate("/");
  };

  const login = trpc.auth.login.useMutation({
    onSuccess: (d) => onLoggedIn(d.token, "Inloggad!"),
    onError: (e) => toast.error(e.message),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: (d) => onLoggedIn(d.token, "Konto skapat!"),
    onError: (e) => toast.error(e.message),
  });
  const forgot = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (d) => setResetSent(d.message),
    onError: (e) => toast.error(e.message),
  });

  function submit() {
    if (mode === "login") {
      if (!identifier || !password) return toast.error("Fyll i telefonnummer/e-post och lösenord.");
      login.mutate({ identifier, password });
    } else if (mode === "register") {
      if (!name || !password) return toast.error("Fyll i namn och lösenord.");
      if (!phone && !email) return toast.error("Fyll i telefonnummer eller e-post.");
      register.mutate({ name, password, phone: phone || undefined, email: email || undefined });
    } else {
      if (!identifier) return toast.error("Fyll i telefonnummer eller e-post.");
      forgot.mutate({ identifier });
    }
  }

  const pending = login.isPending || register.isPending || forgot.isPending;

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

        {mode !== "forgot" && (
          <div className="flex rounded-lg bg-secondary p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
                onClick={() => setMode(m)}
              >
                {m === "login" ? "Logga in" : "Skapa konto"}
              </button>
            ))}
          </div>
        )}

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {mode === "forgot" && (
            <div>
              <h1 className="text-xl font-extrabold">Glömt lösenord</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fyll i telefonnummer eller e-post. Finns en e-postadress i ditt konto
                skickar vi en länk dit där du väljer nytt lösenord.
              </p>
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Namn</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}

          {mode === "register" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="070-123 45 67"
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-post (valfritt, behövs för ”glömt lösenord”)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </>
          ) : resetSent && mode === "forgot" ? null : (
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Telefonnummer eller e-post</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="070-123 45 67"
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
          )}

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Lösenord</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary"
                    onClick={() => {
                      setMode("forgot");
                      setResetSent(null);
                    }}
                  >
                    Glömt lösenord?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Minst 8 tecken" : ""}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>
          )}

          {resetSent && mode === "forgot" ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">{resetSent}</div>
          ) : (
            <Button type="submit" className="w-full font-semibold" disabled={pending}>
              {mode === "login" ? "Logga in" : mode === "register" ? "Skapa konto" : "Skicka länk"}
            </Button>
          )}

          {mode === "register" && (
            <p className="text-xs text-muted-foreground">
              Med ett konto kan du skriva på anslagstavlan. Är du
              med i ett jourlag lägger en admin till dig där.
            </p>
          )}
          {mode === "forgot" && (
            <button type="button" className="w-full text-sm font-semibold text-primary" onClick={() => setMode("login")}>
              ← Tillbaka till inloggning
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
