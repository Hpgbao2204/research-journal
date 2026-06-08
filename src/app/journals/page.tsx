import Link from "next/link";
import { venueService } from "@/lib/services/venue-service";
import { DataSourceBadge } from "@/components/data-source-badge";
import { MockDataNotice } from "@/components/mock-data-notice";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
  const journals = await venueService.listJournals();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Journals</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {journals.length} journal{journals.length === 1 ? "" : "s"} in the
          sample dataset.
        </p>
      </div>

      <MockDataNotice />

      {journals.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No journals found. Run the seed script to populate sample data.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journals.map((j) => (
            <li key={j.id}>
              <Link
                href={`/journals/${j.id}`}
                className="flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold leading-tight">{j.name}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {j.publisher ?? "Publisher unknown"}
                    {j.field ? ` · ${j.field}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {j.quartile && <Badge variant="secondary">{j.quartile}</Badge>}
                  {j.openAccess ? <Badge variant="accent">Open Access</Badge> : null}
                  {j.indexing.slice(0, 3).map((ix) => (
                    <Badge key={ix} variant="outline">
                      {ix}
                    </Badge>
                  ))}
                </div>
                <DataSourceBadge dataSource={j.dataSource} isUnverified={j.isUnverified} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
