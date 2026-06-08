"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { library, type SavedItem } from "@/lib/library";

type SaveInput = Omit<SavedItem, "addedAt" | "tags" | "note">;

/** Bookmark toggle that saves an item to the localStorage research library. */
export function SaveToggle({ item, compact = false }: { item: SaveInput; compact?: boolean }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(library.has(item.key));
    return library.subscribe(() => setSaved(library.has(item.key)));
  }, [item.key]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSaved(library.toggle(item));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={saved ? "Remove from library" : "Save to library"}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${saved
          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "border-[var(--border)] hover:bg-[var(--muted)]"
        }`}
    >
      {saved ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
      {!compact && (saved ? "Saved" : "Save")}
    </button>
  );
}
