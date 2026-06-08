import Link from "next/link";
import { recommendationService } from "@/lib/services/recommendation-service";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  let saved: Awaited<ReturnType<typeof recommendationService.listSaved>> = [];
  try {
    saved = await recommendationService.listSaved();
  } catch {
    saved = [];
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Saved recommendations</h1>

      {saved.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          You haven&apos;t saved any recommendations yet. Run an{" "}
          <Link href="/analyze" className="text-[var(--accent)] underline underline-offset-2">
            abstract analysis
          </Link>{" "}
          and press Save on the results.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {saved.map((r) => (
            <li key={r.id}>
              <Link
                href={`/recommendations/${r.id}`}
                className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold leading-tight">{r.inputTitle}</span>
                  <Badge variant={r.method === "AI" ? "accent" : "secondary"}>
                    {r.method === "AI" ? "AI" : "Rule-based"}
                  </Badge>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {r.items.length} venue match(es) · {new Date(r.createdAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
