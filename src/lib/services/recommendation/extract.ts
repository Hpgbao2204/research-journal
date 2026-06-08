import type { AnalyzeRequest, Analysis } from "@/lib/schemas";

/**
 * Deterministic, dependency-free text analysis used by the rule-based fallback
 * and as a base for keyword overlap scoring. Pure function: same input → same
 * output.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "by", "from", "as", "at", "is", "are", "be", "been", "this", "that", "these",
  "those", "we", "our", "it", "its", "their", "they", "which", "such", "can",
  "using", "use", "used", "based", "approach", "method", "methods", "paper",
  "study", "results", "propose", "proposed", "present", "presents", "show",
  "shows", "new", "novel", "via", "into", "across", "between", "while", "than",
  "more", "most", "also", "both", "each", "other", "over", "under", "about",
]);

/** Field → indicative keyword lexicon for discipline inference. */
const FIELD_LEXICON: Record<string, string[]> = {
  "Machine Learning": ["learning", "model", "neural", "training", "reinforcement", "deep", "federated"],
  "Natural Language Processing": ["language", "text", "nlp", "transformer", "translation", "linguistic", "token"],
  "Computer Vision": ["image", "vision", "segmentation", "detection", "video", "visual", "recognition"],
  "Cybersecurity": ["security", "attack", "intrusion", "cryptography", "privacy", "malware", "encryption"],
  "Software Engineering": ["software", "testing", "code", "bug", "continuous", "integration", "refactoring"],
  "Human-Computer Interaction": ["interaction", "usability", "interface", "accessibility", "user", "ux"],
  "Bioinformatics": ["genomic", "protein", "sequencing", "biological", "gene", "molecular"],
  "Distributed Systems": ["distributed", "consensus", "replication", "fault", "tolerance", "consistency"],
  "Data Management": ["database", "query", "data", "integration", "schema", "warehouse"],
  "Robotics": ["robot", "motion", "planning", "sensor", "navigation", "autonomous", "control"],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Returns the top-N most frequent meaningful terms. */
export function topKeywords(text: string, n = 8): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([term]) => term);
}

/** Infer likely disciplines by lexicon overlap with the abstract+title. */
export function inferDisciplines(text: string, declaredField?: string): string[] {
  const tokens = new Set(tokenize(text));
  const scored: Array<{ field: string; score: number }> = [];
  for (const [field, lexicon] of Object.entries(FIELD_LEXICON)) {
    const score = lexicon.reduce((acc, w) => acc + (tokens.has(w) ? 1 : 0), 0);
    if (score > 0) scored.push({ field, score });
  }
  scored.sort((a, b) => b.score - a.score || a.field.localeCompare(b.field));
  const disciplines = scored.map((s) => s.field);
  if (declaredField && !disciplines.includes(declaredField)) {
    disciplines.unshift(declaredField);
  }
  return disciplines.slice(0, 3);
}

function guessContributionType(text: string): string {
  const t = text.toLowerCase();
  if (/\bsurvey\b|\breview\b/.test(t)) return "Survey / review";
  if (/\bbenchmark\b|\bdataset\b|\bempirical\b|\bstudy\b/.test(t)) return "Empirical / dataset";
  if (/\bframework\b|\bsystem\b|\btool\b/.test(t)) return "System / framework";
  if (/\btheorem\b|\bproof\b|\bbound\b/.test(t)) return "Theoretical";
  return "Methodological";
}

function guessMethodology(text: string): string {
  const t = text.toLowerCase();
  if (/\bexperiment|evaluat|benchmark|dataset/.test(t)) return "Experimental evaluation";
  if (/\bsimulation|simulated/.test(t)) return "Simulation";
  if (/\bproof|theoretical|analysis/.test(t)) return "Theoretical analysis";
  if (/\bsurvey|review/.test(t)) return "Literature survey";
  return "Applied / design";
}

/** Build the deterministic analysis portion of a result. */
export function extractAnalysis(request: AnalyzeRequest): Analysis {
  const text = `${request.title}\n${request.abstract}`;
  const extracted = topKeywords(text, 8);
  // Merge user-supplied keywords first (deduped).
  const merged = [...new Set([...request.keywords.map((k) => k.toLowerCase()), ...extracted])].slice(0, 12);
  const disciplines = inferDisciplines(text, request.field);

  return {
    mainTopic: disciplines[0] ?? request.field ?? "General",
    subfield: disciplines[1] ?? disciplines[0] ?? "General",
    methodology: guessMethodology(text),
    contributionType: guessContributionType(text),
    extractedKeywords: merged,
    suitableDisciplines: disciplines.length > 0 ? disciplines : request.field ? [request.field] : ["General"],
  };
}
