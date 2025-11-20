import { ArrowUpDown, Clock } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Shift } from "../types";
import { DAYS_OF_WEEK } from "../types";
import { ShiftActionsCell } from "./ShiftActionsCell";

type ColumnBuilderParams = {
  onView: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
  onToggleStatus: (shift: Shift) => void;
  deletingShiftId?: string | null;
};

export const createShiftColumns = ({
  onView,
  onEdit,
  onToggleStatus,
  deletingShiftId,
}: ColumnBuilderParams): ColumnDef<Shift>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    header: ({ column }) => (
      <button
        className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>Nombre</span>
        <ArrowUpDown className="h-4 w-4" />
      </button>
    ),
    accessorKey: "name",
    cell: ({ row }) => {
      const name = row.original.name;
      const color = row.original.color;
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{name}</span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    header: "Horario",
    accessorKey: "start_time",
    cell: ({ row }) => {
      const startTime = row.original.start_time;
      const endTime = row.original.end_time;
      return (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>
            {startTime} - {endTime}
          </span>
        </div>
      );
    },
  },
  {
    header: "Descanso",
    accessorKey: "break_minutes",
    cell: ({ row }) => {
      const breakMinutes = row.original.break_minutes;
      return <span>{breakMinutes} min</span>;
    },
  },
  {
    header: "Días",
    accessorKey: "days_of_week",
    cell: ({ row }) => {
      const days = row.original.days_of_week;
      const dayLabels = days
        .map(
          (day) =>
            DAYS_OF_WEEK.find((d) => d.value === day)?.label.substring(0, 3) ||
            day,
        )
        .join(", ");
      return <span className="text-sm">{dayLabels}</span>;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <ShiftActionsCell
        shift={row.original}
        onView={onView}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        isProcessing={row.original.id === deletingShiftId}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
