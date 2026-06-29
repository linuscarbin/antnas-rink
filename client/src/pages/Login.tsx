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

export default function Login() {
  const { isAuthenticated, refresh } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await refresh();
      toast.success("Inloggad!");
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await refresh();
      toast.success("Konto skapat!");
      navigate("/");
    },
    onError: (e) => toast.error(e.message),
  });

  function submit() {
    if (mode === "login") {
      if (!email || !password) return toast.error("Fyll i e-post och lösenord.");
      login.mutate({ email, password });
    } else {
      if (!email || !password || !name)
        return toast.error("Fyll i namn, e-post och lösenord.");
      register.mutate({ email, password, name, phone: phone || undefined });
    }
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

        <div className="flex rounded-lg bg-secondary p-1 mb-6">
          <button
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("login")}
          >
            Logga in
          </button>
          <button
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              mode === "register" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("register")}
          >
            Skapa konto
          </button>
        </div>

        <div className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-1.5">
                <Label>Namn</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon (valfritt)</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="070-123 45 67"
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>E-post</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Lösenord</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={mode === "register" ? "Minst 8 tecken" : ""}
            />
          </div>
          <Button
            className="w-full font-semibold"
            onClick={submit}
            disabled={login.isPending || register.isPending}
          >
            {mode === "login" ? "Logga in" : "Skapa konto"}
          </Button>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "login"
            ? "Har du inget konto? Välj Skapa konto ovan."
            : "Det första kontot blir automatiskt administratör."}
        </p>
        <Link
          href="/"
          className="mt-3 block text-center text-sm font-semibold text-primary"
        >
          Tillbaka till startsidan
        </Link>
      </div>
    </div>
  );
}
