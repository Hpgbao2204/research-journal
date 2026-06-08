"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Download, ExternalLink, Quote, Check } from "lucide-react";
import { DataSourceBadge } from "@/components/data-source-badge";
import { SaveToggle } from "@/components/save-toggle";
import { CITE_FORMATS, cite, googleScholarUrl, type CiteFormat } from "@/lib/cite";
import type { PaperDTO } from "@/lib/dto";

/** Google-Scholar-style paper card with clickable links and citation export. */
export function PaperCard({ paper: p }: { paper: PaperDTO }) {
  const [copied, setCopied] = useState<CiteFormat | null>(null);
  const [open, setOpen] = useState(false);

  async function copyCite(fmt: CiteFormat) {
    try {
      await navigator.clipboard.writeText(cite(p, fmt));
      setCopied(fmt);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
        <Link href={`/papers/${p.id}`} className="font-semibold leading-snug hover:text-[var(--primary)]">
          {p.title}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--muted-foreground)]">
        {p.authors && <span className="line-clamp-1">{p.authors}</span>}
        {p.venueName && <span>· {p.venueName}</span>}
        {p.year && <span>· {p.year}</span>}
        {p.citedByCount != null && <span>· {p.citedByCount} citations</span>}
      </div>

      {p.abstract && (
        <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">{p.abstract}</p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {p.openAccessUrl && (
          <a href={p.openAccessUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-2.5 py-1 font-medium text-[var(--primary-foreground)]">
            <Download className="h-3 w-3" /> Free PDF
          </a>
        )}
        {p.doiUrl && (
          <a href={p.doiUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 hover:bg-[var(--muted)]">
            DOI <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 hover:bg-[var(--muted)]">
          OpenAlex <ExternalLink className="h-3 w-3" />
        </a>
        <a href={googleScholarUrl(p.title)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 hover:bg-[var(--muted)]">
          Google Scholar <ExternalLink className="h-3 w-3" />
        </a>

        <div className="relative">
          <button type="button" onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 hover:bg-[var(--muted)]">
            <Quote className="h-3 w-3" /> Cite
          </button>
          {open && (
            <div className="absolute z-10 mt-1 flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-1 shadow-md">
              {CITE_FORMATS.map((fmt) => (
                <button key={fmt} type="button" onClick={() => copyCite(fmt)}
                  className="flex items-center justify-between gap-3 rounded px-3 py-1.5 text-left hover:bg-[var(--muted)]">
                  {fmt} {copied === fmt && <Check className="h-3 w-3 text-[var(--accent)]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <DataSourceBadge dataSource={p.dataSource} isUnverified={p.isUnverified} />
        <SaveToggle
          item={{
            key: `paper:${p.id}`,
            kind: "paper",
            id: p.id,
            title: p.title,
            subtitle: [p.venueName, p.year ? String(p.year) : null].filter(Boolean).join(" · "),
            href: `/papers/${p.id}`,
            url: p.doiUrl ?? p.openAccessUrl,
          }}
        />
      </div>
    </div>
  );
}
