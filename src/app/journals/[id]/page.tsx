import Link from "next/link";
import { notFound } from "next/navigation";
import { venueService } from "@/lib/services/venue-service";
import { NotFoundError } from "@/lib/http/errors";
import { DataSourceBadge } from "@/components/data-source-badge";
import { FieldValue } from "@/components/field-value";
import type { JournalDTO } from "@/lib/dto";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString() : null;
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let journal: JournalDTO;
  try {
    journal = await venueService.getJournal(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <Link href="/journals" className="text-sm text-[var(--accent)] underline underline-offset-2">
        ← Back to journals
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{journal.name}</h1>
        <DataSourceBadge dataSource={journal.dataSource} isUnverified={journal.isUnverified} />
        {journal.officialUrl && (
          <a
            href={journal.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
          >
            Visit official website ↗
          </a>
        )}
      </div>

      <dl className="grid gap-x-8 gap-y-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-2">
        <FieldValue label="Publisher" value={journal.publisher} />
        <FieldValue label="Field" value={journal.field} />
        <FieldValue label="ISSN" value={journal.issn} />
        <FieldValue label="eISSN" value={journal.eissn} />
        <FieldValue label="Quartile" value={journal.quartile} />
        <FieldValue label="Impact factor" value={journal.impactFactor} />
        <FieldValue
          label="APC"
          value={journal.apc != null ? `${journal.apc}` : null}
        />
        <FieldValue
          label="Open access"
          value={
            journal.openAccess === null
              ? null
              : journal.openAccess
                ? "Yes"
                : "No"
          }
        />
        <FieldValue label="Indexing" value={journal.indexing.join(", ")} />
        <FieldValue label="Country" value={journal.country} />
        <FieldValue
          label="Submission deadline"
          value={formatDate(journal.submissionDeadline)}
        />
        <FieldValue label="Keywords" value={journal.keywords.join(", ")} />
        <FieldValue
          label="Submission URL"
          value={journal.submissionUrl}
          href={journal.submissionUrl}
        />
        <FieldValue
          label="Source URL"
          value={journal.sourceUrl}
          href={journal.sourceUrl}
        />
        <FieldValue label="Scope" value={journal.scope} />
        <FieldValue label="Notes" value={journal.notes} />
        <FieldValue label="Last checked" value={formatDate(journal.lastCheckedAt)} />
      </dl>
    </main>
  );
}
