import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "./data-table";
import { Table as TanStackTable } from "@tanstack/react-table";

interface DataTableCardProps<TData> {
  title: string;
  table: TanStackTable<TData>;
  selectedCount?: number;
  bulkActionLabel?: string;
  onBulkAction?: () => void;
  className?: string;
}

export function DataTableCard<TData>({
  title,
  table,
  selectedCount = 0,
  bulkActionLabel = "Acciones masivas",
  onBulkAction,
  className = "",
}: DataTableCardProps<TData>) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedCount} seleccionado(s)
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCount === 0}
              onClick={onBulkAction}
            >
              {bulkActionLabel}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable table={table} />
      </CardContent>
    </Card>
  );
}
