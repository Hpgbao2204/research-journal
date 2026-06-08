import Link from "next/link";
import { Search, BookOpen, CalendarClock, FileText, Sparkles, ArrowRight } from "lucide-react";
import { MockDataNotice } from "@/components/mock-data-notice";

const features = [
  { title: "Search journals", body: "Filter 30k+ journals by field, quartile, open access, and SJR.", href: "/journals", Icon: BookOpen },
  { title: "Find papers", body: "Search the OpenAlex corpus of scholarly works.", href: "/search", Icon: FileText },
  { title: "Conferences", body: "Browse upcoming conferences and their deadlines.", href: "/conferences", Icon: CalendarClock },
  { title: "Special issues", body: "Explore journal special issues and open calls.", href: "/special-issues", Icon: Sparkles },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16">
      <section className="flex flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-4 py-1.5 text-sm font-medium text-[var(--accent)]">
          <Sparkles className="h-4 w-4" /> AI-assisted venue recommendations
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Find the right venue for your paper.
        </h1>
        <p className="max-w-2xl text-lg text-[var(--muted-foreground)]">
          Search journals, papers, conferences and special issues — then paste your
          abstract to get ranked recommendations with match scores, real SJR
          quartiles, deadlines, and suggested improvements.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-opacity hover:opacity-90"
          >
            Analyze your abstract <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--muted)]"
          >
            <Search className="h-4 w-4" /> Search venues
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ title, body, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--primary)]">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{body}</p>
          </Link>
        ))}
      </section>

      <MockDataNotice />
    </main>
  );
}
