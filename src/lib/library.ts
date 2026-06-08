"use client";

/**
 * Personal research library, persisted in the browser (localStorage). Lets the
 * user save journals and papers, tag them, and add notes — no account needed.
 * A future enhancement can sync this to the database behind auth.
 */

export type SavedKind = "journal" | "paper";

export interface SavedItem {
  key: string; // `${kind}:${id}`
  kind: SavedKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  url?: string | null;
  addedAt: number;
  tags: string[];
  note: string;
}

const STORAGE_KEY = "paperscout.library.v1";
const EVENT = "paperscout-library-change";

function read(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: SavedItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export const library = {
  list(): SavedItem[] {
    return read().sort((a, b) => b.addedAt - a.addedAt);
  },
  has(key: string): boolean {
    return read().some((i) => i.key === key);
  },
  toggle(item: Omit<SavedItem, "addedAt" | "tags" | "note">): boolean {
    const items = read();
    const idx = items.findIndex((i) => i.key === item.key);
    if (idx >= 0) {
      items.splice(idx, 1);
      write(items);
      return false;
    }
    items.push({ ...item, addedAt: Date.now(), tags: [], note: "" });
    write(items);
    return true;
  },
  remove(key: string): void {
    write(read().filter((i) => i.key !== key));
  },
  update(key: string, patch: Partial<Pick<SavedItem, "tags" | "note">>): void {
    write(read().map((i) => (i.key === key ? { ...i, ...patch } : i)));
  },
  allTags(): string[] {
    return [...new Set(read().flatMap((i) => i.tags))].sort();
  },
  subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => { };
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener(EVENT, cb);
      window.removeEventListener("storage", cb);
    };
  },
  EVENT,
};
