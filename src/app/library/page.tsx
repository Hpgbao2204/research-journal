"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Trash2, ExternalLink } from "lucide-react";
import { library, type SavedItem } from "@/lib/library";

export default function LibraryPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [kind, setKind] = useState<"all" | "journal" | "paper">("all");
  const [tag, setTag] = useState("");

  useEffect(() => {
    const refresh = () => setItems(library.list());
    refresh();
    return library.subscribe(refresh);
  }, []);

  const tags = useMemo(() => [...new Set(items.flatMap((i) => i.tags))].sort(), [items]);
  const filtered = items.filter(
    (i) => (kind === "all" || i.kind === kind) && (tag === "" || i.tags.includes(tag)),
  );

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-2">
        <Bookmark className="h-5 w-5 text-[var(--primary)]" />
        <h1 className="text-2xl font-semibold tracking-tight">My library</h1>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        Saved journals and papers, stored in this browser. Add tags and notes to
        organize your research.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "journal", "paper"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${kind === k ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border border-[var(--border)]"
              }`}
          >
            {k}
          </button>
        ))}
        {tags.length > 0 && (
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] py-16 text-center text-sm text-[var(--muted-foreground)]">
          Nothing saved yet. Use the bookmark button on journals and papers.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((item) => (
            <LibraryRow key={item.key} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}

function LibraryRow({ item }: { item: SavedItem }) {
  const [tagInput, setTagInput] = useState(item.tags.join(", "));
  const [note, setNote] = useState(item.note);

  function save() {
    library.update(item.key, {
      tags: tagInput.split(",").map((t) => t.trim()).filter(Boolean),
      note,
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <Link href={item.href} className="font-semibold leading-snug hover:text-[var(--primary)]">
            {item.title}
          </Link>
          <span className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            {item.kind}
            {item.subtitle ? ` · ${item.subtitle}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)]">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button onClick={() => library.remove(item.key)} title="Remove" className="text-[var(--muted-foreground)] hover:text-[var(--warning)]">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onBlur={save}
          placeholder="tags (comma-separated)"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={save}
          placeholder="note"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
        />
      </div>
    </li>
  );
}
