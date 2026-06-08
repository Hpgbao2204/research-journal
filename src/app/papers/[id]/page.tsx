import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { openAlex } from "@/lib/providers/openalex";
import { PaperCard } from "@/components/paper-card";
import { SummarizeButton } from "./summarize-button";
import type { PaperDTO } from "@/lib/dto";

export const dynamic = "force-dynamic";

export default async function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const work = await openAlex.getWork(id);
  if (!work) notFound();

  const { paper, referenced, related } = work;
  const [references, relatedPapers, citedBy] = await Promise.all([
    openAlex.getWorksByIds(referenced.slice(0, 12)),
    openAlex.getWorksByIds(related.slice(0, 8)),
    openAlex.citedBy(id, 8),
  ]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <Link href="/search" className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      <PaperCard paper={paper} />
      <SummarizeButton title={paper.title} abstract={paper.abstract} />


      <Section title={`References (${references.length})`} papers={references}
        empty="No reference list available from OpenAlex." />
      <Section title={`Cited by (${citedBy.length}${citedBy.length === 8 ? "+" : ""})`} papers={citedBy}
        empty="No citing works found yet." />
      <Section title={`Related papers (${relatedPapers.length})`} papers={relatedPapers}
        empty="No related papers found." />
    </main>
  );
}

function Section({ title, papers, empty }: { title: string; papers: PaperDTO[]; empty: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {papers.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {papers.map((p) => (
            <li key={p.id}>
              <PaperCard paper={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
