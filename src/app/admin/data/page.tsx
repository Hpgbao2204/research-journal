import { adminService } from "@/lib/services/admin-service";
import { Badge } from "@/components/ui/badge";
import { SeedButton } from "./seed-button";

export const dynamic = "force-dynamic";

export default async function AdminDataPage() {
  const listing = await adminService.listAll();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Data management</h1>
        <SeedButton />
      </div>

      <div
        role="note"
        className="rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning)]"
      >
        Admin area (MVP) — no authentication yet. Journals & papers are served
        live from OpenAlex; the records below are the DB-backed sample data
        (conferences & special issues) plus any imported cache. Re-seeding is
        idempotent.
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminColumn title={`Conferences (${listing.conferences.length})`}>
          {listing.conferences.map((c) => (
            <Row key={c.id} label={c.name} status={c.verificationStatus} />
          ))}
        </AdminColumn>
        <AdminColumn title={`Special issues (${listing.specialIssues.length})`}>
          {listing.specialIssues.map((s) => (
            <Row key={s.id} label={s.title} status={s.verificationStatus} />
          ))}
        </AdminColumn>
        <AdminColumn title={`Cached journals (${listing.journals.length})`}>
          {listing.journals.length === 0 ? (
            <li className="text-sm text-[var(--muted-foreground)]">
              None cached — journals are served live from OpenAlex.
            </li>
          ) : (
            listing.journals.map((j) => (
              <Row key={j.id} label={j.name} status={j.verificationStatus} />
            ))
          )}
        </AdminColumn>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">
        Papers in DB cache: {listing.papers}
      </p>
    </main>
  );
}

function AdminColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        {title}
      </h2>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );
}

function Row({ label, status }: { label: string; status: string }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="truncate">{label}</span>
      <Badge variant={status === "UNVERIFIED_MOCK" ? "warning" : "secondary"}>
        {status === "UNVERIFIED_MOCK" ? "mock" : status.toLowerCase()}
      </Badge>
    </li>
  );
}
