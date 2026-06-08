import { Badge } from "@/components/ui/badge";
import type { DataSourceDTO } from "@/lib/dto";

/**
 * Shows the data source label and, for unverified mock records, an explicit
 * "Unverified sample data" indicator (Req 2.15, 10.3).
 */
export function DataSourceBadge({
  dataSource,
  isUnverified,
}: {
  dataSource: DataSourceDTO | null;
  isUnverified: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {isUnverified && <Badge variant="warning">Unverified sample data</Badge>}
      {dataSource && (
        <Badge variant="outline" title={`Reliability: ${dataSource.reliability}`}>
          Source: {dataSource.name}
        </Badge>
      )}
    </span>
  );
}
