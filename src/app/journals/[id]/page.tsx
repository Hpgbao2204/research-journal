import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { venueService } from "@/lib/services/venue-service";
import { NotFoundError } from "@/lib/http/errors";
import { DataSourceBadge } from "@/components/data-source-badge";
import { FieldValue } from "@/components/field-value";
import { QuartileBadge } from "@/components/quartile-badge";
import { Badge } from "@/components/ui/badge";
import type { JournalDTO } from "@/lib/dto";

export const dynamic = "force-dynamic";

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
      <Link href="/search" className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      <header className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{journal.name}</h1>
          <QuartileBadge quartile={journal.quartile} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
          {journal.publisher && <span>{journal.publisher}</span>}
          {journal.country && <span>· {journal.country}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {journal.sjr != null && (
            <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-medium">SJR {journal.sjr}</span>
          )}
          {journal.hIndex != null && (
            <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-medium">H-index {journal.hIndex}</span>
          )}
          {journal.openAccess && <Badge variant="accent">Open Access</Badge>}
        </div>
        <DataSourceBadge dataSource={journal.dataSource} isUnverified={journal.isUnverified} />
        <div className="flex flex-wrap gap-2 pt-1">
          {journal.officialUrl && (
            <a
              href={journal.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
            >
              Official website <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <a
            href={journal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
          >
            View on Scimago <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </header>

      {journal.categories.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Subject categories
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {journal.categories.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <dl className="grid gap-x-8 gap-y-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-6 sm:grid-cols-2">
        <FieldValue label="Publisher" value={journal.publisher} />
        <FieldValue label="Subject area" value={journal.areas.join(", ")} />
        <FieldValue label="ISSN" value={journal.issn} />
        <FieldValue label="eISSN" value={journal.eissn} />
        <FieldValue label="Quartile" value={journal.quartile} />
        <FieldValue label="SJR" value={journal.sjr} />
        <FieldValue label="H-index" value={journal.hIndex} />
        <FieldValue label="Indexing" value={journal.indexing.join(", ")} />
        <FieldValue label="Open access" value={journal.openAccess == null ? null : journal.openAccess ? "Yes" : "No"} />
        <FieldValue label="Country" value={journal.country} />
        <FieldValue label="Scope" value={journal.scope} />
        <FieldValue label="Notes" value={journal.notes} />
        <FieldValue label="Source URL" value={journal.sourceUrl} href={journal.sourceUrl} />
      </dl>
    </main>
  );
}
