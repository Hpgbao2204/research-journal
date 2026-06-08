import Link from "next/link";

const links = [
  { href: "/search", label: "Search" },
  { href: "/journals", label: "Journals" },
  { href: "/conferences", label: "Conferences" },
  { href: "/special-issues", label: "Special Issues" },
  { href: "/saved", label: "Saved" },
];

/** Global top navigation (Req 1.3). */
export function SiteNav() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight">
          PaperScout <span className="text-[var(--accent)]">AI</span>
        </Link>
        <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          href="/analyze"
          className="rounded-[var(--radius)] bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          Analyze abstract
        </Link>
      </nav>
    </header>
  );
}
