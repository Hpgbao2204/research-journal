import type { ReactNode } from "react";

/**
 * Renders a labeled field value. When the value is null/undefined/empty, it
 * shows an explicit "missing / unverified" indicator instead (Req 3.3, 4.4, 5.5).
 */
export function FieldValue({
  label,
  value,
  href,
}: {
  label: string;
  value: ReactNode;
  href?: string | null;
}) {
  const isMissing =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd className="text-sm">
        {isMissing ? (
          <span className="italic text-[var(--warning)]">
            Missing / unverified
          </span>
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-2"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
