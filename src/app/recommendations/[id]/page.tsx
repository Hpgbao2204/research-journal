import Link from "next/link";
import { notFound } from "next/navigation";
import { recommendationService } from "@/lib/services/recommendation-service";
import { Badge } from "@/components/ui/badge";
import { SaveButton } from "./save-button";
import type { RecommendationResultDTO } from "@/lib/dto";

export const dynamic = "force-dynamic";

const venuePath: Record<string, string> = {
  JOURNAL: "journals",
  CONFERENCE: "conferences",
  SPECIAL_ISSUE: "special-issues",
};

function scoreColor(score: number): string {
  if (score >= 70) return "var(--accent)";
  if (score >= 40) return "var(--primary)";
  return "var(--muted-foreground)";
}

export default async function RecommendationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result: RecommendationResultDTO | null = await recommendationService.getById(id);
  if (!result) notFound();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Recommendations</h1>
        <div className="flex items-center gap-2">
          <Badge variant={result.method === "AI" ? "accent" : "secondary"}>
            {result.method === "AI" ? "AI-generated" : "Rule-based"}
          </Badge>
          <SaveButton resultId={result.id} initiallySaved={result.saved} />
        </div>
      </div>

      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-1 text-base font-semibold">{result.inputTitle}</h2>
        <p className="text-sm text-[var(--muted-foreground)] line-clamp-3">{result.inputAbstract}</p>
      </section>

      <section className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-2">
        <Analysis label="Main topic" value={result.mainTopic} />
        <Analysis label="Subfield" value={result.subfield} />
        <Analysis label="Methodology" value={result.methodology} />
        <Analysis label="Contribution type" value={result.contributionType} />
        <Analysis label="Suitable disciplines" value={result.suitableDisciplines.join(", ")} />
        <Analysis label="Extracted keywords" value={result.extractedKeywords.join(", ")} />
      </section>

      {(result.suggestedTitle || result.suggestedAbstract) && (
        <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold">Suggested improvements</h3>
          {result.suggestedTitle && (
            <p className="text-sm"><strong>Title:</strong> {result.suggestedTitle}</p>
          )}
          {result.suggestedAbstract && (
            <p className="text-sm"><strong>Abstract:</strong> {result.suggestedAbstract}</p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Venue matches ({result.items.length})</h2>
        {result.items.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No venue matches were found. Try a broader abstract or fewer constraints.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {result.items.map((it) => {
              const href = venuePath[it.venueType]
                ? `/${venuePath[it.venueType]}/${it.venueId}`
                : null;
              return (
                <li
                  key={it.id}
                  className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold leading-tight">
                        {href ? (
                          <Link href={href} className="text-[var(--accent)] underline underline-offset-2">
                            {it.venueName}
                          </Link>
                        ) : (
                          it.venueName
                        )}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">{it.venueType}</span>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-white"
                      style={{ backgroundColor: scoreColor(it.matchScore) }}
                    >
                      {it.matchScore}/100
                    </span>
                  </div>
                  <p className="text-sm">{it.reason}</p>
                  {it.scopeAlignment && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Scope: {it.scopeAlignment}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {it.submissionDeadline && (
                      <Badge variant="outline">
                        Deadline: {new Date(it.submissionDeadline).toLocaleDateString()}
                      </Badge>
                    )}
                    {it.indexing.map((ix) => (
                      <Badge key={ix} variant="outline">
                        {ix}
                      </Badge>
                    ))}
                    {it.submissionUrl && (
                      <a
                        href={it.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] underline underline-offset-2"
                      >
                        Submission link ↗
                      </a>
                    )}
                  </div>
                  {it.warnings.length > 0 && (
                    <ul className="flex flex-col gap-0.5">
                      {it.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-[var(--warning)]">
                          ⚠ {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function Analysis({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}
