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
      <strong className="font-semibold">Sample data:</strong> All journals,
      conferences, and special issues shown here are unverified mock data for
      demonstration only. They are not verified against any authoritative source.
      Always confirm details on the venue&apos;s official website before submitting.
    </div>
  );
}
