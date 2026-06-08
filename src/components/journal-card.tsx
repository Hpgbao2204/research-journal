import Link from "next/link";
import { BookOpen, Globe, TrendingUp } from "lucide-react";
import { QuartileBadge } from "@/components/quartile-badge";
import { DataSourceBadge } from "@/components/data-source-badge";
import { Badge } from "@/components/ui/badge";
import type { JournalDTO } from "@/lib/dto";

/** Rich journal card used in search results and journal listings. */
export function JournalCard({ journal: j }: { journal: JournalDTO }) {
  return (
    <Link
      href={`/journals/${j.id}`}
      className="group flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--primary)]">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
          {j.name}
        </span>
        <QuartileBadge quartile={j.quartile} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
        {j.publisher && <span>{j.publisher}</span>}
        {j.country && (
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3 w-3" /> {j.country}
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        {j.sjr != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">
            <TrendingUp className="h-3 w-3" /> SJR {j.sjr}
          </span>
        )}
        {j.hIndex != null && (
          <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">
            H-index {j.hIndex}
          </span>
        )}
        {j.openAccess && <Badge variant="accent">Open Access</Badge>}
        {j.areas.slice(0, 2).map((a) => (
          <Badge key={a} variant="outline">
            {a}
          </Badge>
        ))}
      </div>

      <DataSourceBadge dataSource={j.dataSource} isUnverified={j.isUnverified} />
    </Link>
  );
}
