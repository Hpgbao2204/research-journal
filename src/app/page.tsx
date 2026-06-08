import Link from "next/link";
import { MockDataNotice } from "@/components/mock-data-notice";

const features = [
  {
    title: "Search papers",
    body: "Find academic papers by keyword, field, author, and venue.",
    href: "/search",
  },
  {
    title: "Discover journals",
    body: "Browse multi-disciplinary journals with indexing, quartile, and APC details.",
    href: "/journals",
  },
  {
    title: "Find conferences",
    body: "Track upcoming conferences, their deadlines, modes, and rankings.",
    href: "/conferences",
  },
  {
    title: "Special issues / CFPs",
    body: "Explore journal special issues and open calls for papers.",
    href: "/special-issues",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12">
      <section className="flex flex-col items-start gap-5">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight">
          Find the right venue for your paper.
        </h1>
        <p className="max-w-2xl text-lg text-[var(--muted-foreground)]">
          PaperScout AI helps you search academic papers, journals, special
          issues, and conferences — then analyzes your abstract to recommend
          where to submit, with match scores, scope alignment, deadlines, and
          suggested improvements.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/analyze"
            className="rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            Analyze your abstract
          </Link>
          <Link
            href="/search"
            className="rounded-[var(--radius)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
          >
            Search venues
          </Link>
        </div>
      </section>

      <MockDataNotice />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--accent)]"
          >
            <h2 className="text-base font-semibold">{f.title}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{f.body}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
