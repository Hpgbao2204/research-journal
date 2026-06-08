import type { PaperDTO } from "@/lib/dto";

/**
 * Citation utilities — build BibTeX, RIS, APA, and IEEE citations from a paper.
 * Pure functions, usable on client and server.
 */

function authorList(authors: string | null): string[] {
  if (!authors) return [];
  return authors.split(",").map((a) => a.trim()).filter(Boolean);
}

function firstAuthorKey(authors: string | null, year: number | null): string {
  const first = authorList(authors)[0];
  const last = first ? first.split(/\s+/).pop() ?? "anon" : "anon";
  return `${last.toLowerCase().replace(/[^a-z0-9]/g, "")}${year ?? ""}`;
}

export function toBibTeX(p: PaperDTO): string {
  const key = firstAuthorKey(p.authors, p.year);
  const fields: Array<[string, string | number | null]> = [
    ["title", p.title],
    ["author", authorList(p.authors).join(" and ") || null],
    ["journal", p.venueName],
    ["year", p.year],
    ["doi", p.doi ? p.doi.replace(/^https?:\/\/doi\.org\//, "") : null],
    ["url", p.doiUrl ?? p.sourceUrl],
  ];
  const body = fields
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(",\n");
  return `@article{${key},\n${body}\n}`;
}

export function toRIS(p: PaperDTO): string {
  const lines = ["TY  - JOUR", `TI  - ${p.title}`];
  for (const a of authorList(p.authors)) lines.push(`AU  - ${a}`);
  if (p.venueName) lines.push(`JO  - ${p.venueName}`);
  if (p.year) lines.push(`PY  - ${p.year}`);
  if (p.doi) lines.push(`DO  - ${p.doi.replace(/^https?:\/\/doi\.org\//, "")}`);
  if (p.doiUrl ?? p.sourceUrl) lines.push(`UR  - ${p.doiUrl ?? p.sourceUrl}`);
  lines.push("ER  - ");
  return lines.join("\n");
}

export function toAPA(p: PaperDTO): string {
  const authors = authorList(p.authors);
  const authorStr =
    authors.length === 0
      ? ""
      : authors.length === 1
        ? authors[0]
        : `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`;
  const year = p.year ? ` (${p.year}).` : "";
  const venue = p.venueName ? ` *${p.venueName}*.` : "";
  const doi = p.doiUrl ? ` ${p.doiUrl}` : "";
  return `${authorStr}${year} ${p.title}.${venue}${doi}`.trim();
}

export function toIEEE(p: PaperDTO): string {
  const authors = authorList(p.authors);
  const authorStr = authors.length > 0 ? `${authors.join(", ")}, ` : "";
  const venue = p.venueName ? `, *${p.venueName}*` : "";
  const year = p.year ? `, ${p.year}` : "";
  return `${authorStr}"${p.title}"${venue}${year}.`;
}

export const CITE_FORMATS = ["APA", "IEEE", "BibTeX", "RIS"] as const;
export type CiteFormat = (typeof CITE_FORMATS)[number];

export function cite(p: PaperDTO, format: CiteFormat): string {
  switch (format) {
    case "APA":
      return toAPA(p);
    case "IEEE":
      return toIEEE(p);
    case "BibTeX":
      return toBibTeX(p);
    case "RIS":
      return toRIS(p);
  }
}

export function googleScholarUrl(title: string): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;
}
