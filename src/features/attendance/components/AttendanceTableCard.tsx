import { DataTableCard } from "@/components/ui/data-table-card";
import type { Table } from "@tanstack/react-table";
import type { AttendanceEvent } from "../types";
import type { ActionMenuItem } from "@/components/ui/action-menu";

type AttendanceTableCardProps = {
  table: Table<AttendanceEvent>;
  bulkActions?: ActionMenuItem[];
  isProcessing?: boolean;
};

export function AttendanceTableCard({
  table,
  bulkActions = [],
}: AttendanceTableCardProps) {
  return (
    <DataTableCard
      title="Eventos de asistencia marcados"
      table={table}
      selectedCount={table.getSelectedRowModel().rows.length}
      bulkActionLabel="Acciones masivas"
      bulkActions={bulkActions}
    />
  );
}
