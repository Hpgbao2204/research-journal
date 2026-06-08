import Link from "next/link";
import { venueService } from "@/lib/services/venue-service";
import { DataSourceBadge } from "@/components/data-source-badge";
import { MockDataNotice } from "@/components/mock-data-notice";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SpecialIssuesPage() {
  const specialIssues = await venueService.listSpecialIssues();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Special Issues</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {specialIssues.length} special issue{specialIssues.length === 1 ? "" : "s"}{" "}
          / call{specialIssues.length === 1 ? "" : "s"} for papers in the sample
          dataset.
        </p>
      </div>

      <MockDataNotice />

      {specialIssues.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No special issues found. Run the seed script to populate sample data.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specialIssues.map((s) => (
            <li key={s.id}>
              <Link
                href={`/special-issues/${s.id}`}
                className="flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold leading-tight">{s.title}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {s.journalName ?? s.publisher ?? "Journal unknown"}
                    {s.field ? ` · ${s.field}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{s.lifecycleStatus}</Badge>
                </div>
                <DataSourceBadge dataSource={s.dataSource} isUnverified={s.isUnverified} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
