import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "./data-table";
import { Table as TanStackTable } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { ChevronDown } from "lucide-react";

interface DataTableCardProps<TData> {
  title: string;
  table: TanStackTable<TData>;
  selectedCount?: number;
  bulkActionLabel?: string;
  onBulkAction?: () => void;
  className?: string;
  bulkActions?: ActionMenuItem[];
}

export function DataTableCard<TData>({
  title,
  table,
  selectedCount = 0,
  bulkActionLabel = "Acciones masivas",
  onBulkAction,
  className = "",
  bulkActions = [],
}: DataTableCardProps<TData>) {
  const hasBulkDropdown = bulkActions.length > 0;
  const isSelectionEmpty = selectedCount === 0;

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
            {hasBulkDropdown ? (
              <ActionMenu
                items={bulkActions}
                disabled={isSelectionEmpty}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isSelectionEmpty}
                  >
                    {bulkActionLabel}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                }
              />
            ) : (
              onBulkAction && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSelectionEmpty}
                  onClick={onBulkAction}
                >
                  {bulkActionLabel}
                </Button>
              )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable table={table} />
      </CardContent>
    </Card>
  );
}
