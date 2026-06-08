import Link from "next/link";
import { notFound } from "next/navigation";
import { venueService } from "@/lib/services/venue-service";
import { NotFoundError } from "@/lib/http/errors";
import { DataSourceBadge } from "@/components/data-source-badge";
import { FieldValue } from "@/components/field-value";
import { Badge } from "@/components/ui/badge";
import type { SpecialIssueDTO } from "@/lib/dto";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString() : null;
}

export default async function SpecialIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let issue: SpecialIssueDTO;
  try {
    issue = await venueService.getSpecialIssue(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <Link href="/special-issues" className="text-sm text-[var(--accent)] underline underline-offset-2">
        ← Back to special issues
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{issue.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{issue.lifecycleStatus}</Badge>
          <DataSourceBadge dataSource={issue.dataSource} isUnverified={issue.isUnverified} />
        </div>
        {issue.officialUrl && (
          <a
            href={issue.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
          >
            Visit official website ↗
          </a>
        )}
      </div>

      <dl className="grid gap-x-8 gap-y-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-2">
        <FieldValue
          label="Related journal"
          value={
            issue.journalName && issue.journalId ? (
              <Link
                href={`/journals/${issue.journalId}`}
                className="text-[var(--accent)] underline underline-offset-2"
              >
                {issue.journalName}
              </Link>
            ) : (
              issue.journalName
            )
          }
        />
        <FieldValue label="Publisher" value={issue.publisher} />
        <FieldValue label="Field" value={issue.field} />
        <FieldValue label="Guest editors" value={issue.guestEditors} />
        <FieldValue label="Submission deadline" value={formatDate(issue.submissionDeadline)} />
        <FieldValue label="Publication timeline" value={issue.publicationTimeline} />
        <FieldValue label="Keywords" value={issue.keywords.join(", ")} />
        <FieldValue label="Submission URL" value={issue.submissionUrl} href={issue.submissionUrl} />
        <FieldValue label="Source URL" value={issue.sourceUrl} href={issue.sourceUrl} />
        <FieldValue label="Topic / scope" value={issue.topicScope} />
        <FieldValue label="Last checked" value={formatDate(issue.lastCheckedAt)} />
      </dl>
    </main>
  );
}
