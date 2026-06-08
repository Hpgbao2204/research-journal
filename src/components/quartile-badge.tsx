/** Colored SJR quartile badge: Q1 (strong green) → Q4 (faint). */
export function QuartileBadge({ quartile }: { quartile: string | null }) {
  if (!quartile) return null;
  const styles: Record<string, { bg: string; fg: string }> = {
    Q1: { bg: "#2e8f6f", fg: "#ffffff" },
    Q2: { bg: "#5cb495", fg: "#ffffff" },
    Q3: { bg: "#a7d7c5", fg: "#1f2d28" },
    Q4: { bg: "#d6ebe2", fg: "#1f2d28" },
  };
  const s = styles[quartile] ?? styles.Q4;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.fg }}
      title={`SJR best quartile: ${quartile}`}
    >
      {quartile}
    </span>
  );
}
