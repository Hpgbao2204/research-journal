import Link from "next/link";
import { notFound } from "next/navigation";
import { venueService } from "@/lib/services/venue-service";
import { NotFoundError } from "@/lib/http/errors";
import { DataSourceBadge } from "@/components/data-source-badge";
import { FieldValue } from "@/components/field-value";
import { Badge } from "@/components/ui/badge";
import type { ConferenceDTO } from "@/lib/dto";

export const dynamic = "force-dynamic";

const rankingLabels: Record<string, string> = {
  CORE_A_STAR: "CORE A*",
  CORE_A: "CORE A",
  CORE_B: "CORE B",
  CORE_C: "CORE C",
  OTHER: "Other",
};

function formatDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString() : null;
}

export default async function ConferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let conference: ConferenceDTO;
  try {
    conference = await venueService.getConference(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <Link href="/conferences" className="text-sm text-[var(--accent)] underline underline-offset-2">
        ← Back to conferences
      </Link>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {conference.acronym ? `${conference.acronym} — ` : ""}
          {conference.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{conference.lifecycleStatus}</Badge>
          <DataSourceBadge dataSource={conference.dataSource} isUnverified={conference.isUnverified} />
        </div>
        {conference.officialUrl && (
          <a
            href={conference.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
          >
            Visit official website ↗
          </a>
        )}
      </div>

      <dl className="grid gap-x-8 gap-y-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-2">
        <FieldValue label="Acronym" value={conference.acronym} />
        <FieldValue label="Field" value={conference.field} />
        <FieldValue label="Organizer" value={conference.organizer} />
        <FieldValue label="Location" value={conference.location} />
        <FieldValue label="Country" value={conference.country} />
        <FieldValue label="Mode" value={conference.mode} />
        <FieldValue
          label="Ranking"
          value={conference.ranking ? rankingLabels[conference.ranking] ?? conference.ranking : null}
        />
        <FieldValue label="Indexing" value={conference.indexing.join(", ")} />
        <FieldValue label="Submission deadline" value={formatDate(conference.submissionDeadline)} />
        <FieldValue label="Notification date" value={formatDate(conference.notificationDate)} />
        <FieldValue label="Conference date" value={formatDate(conference.conferenceDate)} />
        <FieldValue label="Keywords" value={conference.keywords.join(", ")} />
        <FieldValue label="CFP URL" value={conference.cfpUrl} href={conference.cfpUrl} />
        <FieldValue label="Source URL" value={conference.sourceUrl} href={conference.sourceUrl} />
        <FieldValue label="Last checked" value={formatDate(conference.lastCheckedAt)} />
      </dl>
    </main>
  );
}
