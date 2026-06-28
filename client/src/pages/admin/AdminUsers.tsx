import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const utils = trpc.useUtils();
  const usersQuery = trpc.users.list.useQuery();
  const setRole = trpc.users.setRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Roll uppdaterad.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-2 max-w-3xl">
      <p className="text-sm text-muted-foreground mb-2">
        Admins kan hantera scheman, kontakter, bokningar och användare. Vanliga
        användare kan uppdatera status, boka och skriva på anslagstavlan.
      </p>
      {usersQuery.isLoading ? (
        <>
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </>
      ) : (
        usersQuery.data?.map((u) => (
          <div key={u.id} className="iso-card p-4 flex items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-extrabold shrink-0">
              {(u.name || u.email || "?").charAt(0).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                {u.name || "Namnlös"}{" "}
                {u.role === "admin" && (
                  <Badge className="ml-1 bg-primary">Admin</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {u.email || "—"}
                {u.phone ? ` · ${u.phone}` : ""}
              </div>
            </div>
            {u.role === "admin" ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-card gap-1.5"
                onClick={() => setRole.mutate({ id: u.id, role: "user" })}
                disabled={setRole.isPending}
              >
                <ShieldOff className="h-4 w-4" /> Gör till användare
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="bg-card gap-1.5"
                onClick={() => setRole.mutate({ id: u.id, role: "admin" })}
                disabled={setRole.isPending}
              >
                <ShieldCheck className="h-4 w-4" /> Gör till admin
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
