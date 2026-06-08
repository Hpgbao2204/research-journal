/**
 * Site-wide notice that all venue data is unverified sample/mock data.
 * Rendered on the landing page and list pages (Req 1.4, 2.15, 10.3).
 */
export function MockDataNotice() {
  return (
    <div
      role="note"
      className="rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning)]"
    >
      <strong className="font-semibold">Data sources:</strong> Journals and
      papers are live from OpenAlex (real data). Conferences and special issues
      are unverified sample data for demonstration only. Always confirm details
      on the venue&apos;s official website before submitting.
    </div>
  );
}
