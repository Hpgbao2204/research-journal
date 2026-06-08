import Link from "next/link";
import { venueService } from "@/lib/services/venue-service";
import { DataSourceBadge } from "@/components/data-source-badge";
import { MockDataNotice } from "@/components/mock-data-notice";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const rankingLabels: Record<string, string> = {
  CORE_A_STAR: "CORE A*",
  CORE_A: "CORE A",
  CORE_B: "CORE B",
  CORE_C: "CORE C",
  OTHER: "Other",
};

export default async function ConferencesPage() {
  const conferences = await venueService.listConferences();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Conferences</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {conferences.length} conference{conferences.length === 1 ? "" : "s"} in
          the sample dataset.
        </p>
      </div>

      <MockDataNotice />

      {conferences.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No conferences found. Run the seed script to populate sample data.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conferences.map((c) => (
            <li key={c.id}>
              <Link
                href={`/conferences/${c.id}`}
                className="flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold leading-tight">
                    {c.acronym ? `${c.acronym} — ` : ""}
                    {c.name}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {c.organizer ?? "Organizer unknown"}
                    {c.location ? ` · ${c.location}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{c.lifecycleStatus}</Badge>
                  {c.ranking && <Badge variant="outline">{rankingLabels[c.ranking] ?? c.ranking}</Badge>}
                  {c.mode && <Badge variant="outline">{c.mode}</Badge>}
                </div>
                <DataSourceBadge dataSource={c.dataSource} isUnverified={c.isUnverified} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
