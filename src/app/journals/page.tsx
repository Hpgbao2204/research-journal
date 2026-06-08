import { venueService } from "@/lib/services/venue-service";
import { MockDataNotice } from "@/components/mock-data-notice";
import { JournalCard } from "@/components/journal-card";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
  const journals = await venueService.listJournals();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Top journals</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Highest-ranked journals by SJR from the Scimago catalogue. Use{" "}
          <a href="/search" className="text-[var(--accent)] underline underline-offset-2">
            Search
          </a>{" "}
          to filter by field, quartile, open access, and more.
        </p>
      </div>

      <MockDataNotice />

      {journals.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No journals available.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journals.map((j) => (
            <li key={j.id}>
              <JournalCard journal={j} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
