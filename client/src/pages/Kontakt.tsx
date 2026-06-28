import SiteLayout from "@/components/SiteLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Mail, Phone, UserRound } from "lucide-react";

export default function Kontakt() {
  const contactsQuery = trpc.contacts.list.useQuery();

  return (
    <SiteLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Kontaktpersoner</h1>
        <p className="text-muted-foreground">
          Ansvariga för rinken och dess skötsel.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contactsQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))
          ) : contactsQuery.data && contactsQuery.data.length > 0 ? (
            contactsQuery.data.map((c) => (
              <div key={c.id} className="iso-card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-extrabold leading-tight">{c.name}</div>
                    <div className="text-sm text-primary font-semibold">
                      {c.role}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-2 text-foreground hover:text-primary"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="flex items-center gap-2 text-foreground hover:text-primary break-all"
                    >
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {c.email}
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="iso-card p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">
              Inga kontaktpersoner inlagda ännu.
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
