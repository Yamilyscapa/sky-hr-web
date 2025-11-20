import { useMemo } from "react";
import { ArrowUpDown, Ban, CheckCircle, Eye, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/ui/data-table-card";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import type { PaginationMeta } from "@/api";
import type { Visitor } from "../types";
import { StatusBadge } from "./VisitorStatusBadge";

type VisitorsTableProps = {
  visitors: Visitor[];
  pagination: PaginationMeta | null;
  page: number;
  pageSize: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
  onView: (visitor: Visitor) => void;
  onViewAccessAreas: (visitor: Visitor) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
};

export function VisitorsTable({
  visitors,
  pagination,
  page,
  pageSize,
  isFetching,
  onPageChange,
  onView,
  onViewAccessAreas,
  onApprove,
  onReject,
  onCancel,
}: VisitorsTableProps) {
  const columns = useMemo(
    () =>
      createColumns({
        onView,
        onViewAccessAreas,
        onApprove,
        onReject,
        onCancel,
      }),
    [onApprove, onCancel, onReject, onView, onViewAccessAreas],
  );

  const table = useReactTable({
    data: visitors,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    manualPagination: true,
    pageCount: pagination ? pagination.totalPages : 1,
  });

  const totalPages =
    pagination && pagination.pageSize > 0
      ? Math.ceil(pagination.total / pagination.pageSize)
      : 1;

  const hasPagination = pagination && pagination.total > pageSize;

  return (
    <>
      <DataTableCard title="" table={table} />
      {hasPagination && pagination && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {`Mostrando ${
              (pagination.page - 1) * pagination.pageSize + 1
            } - ${Math.min(
              pagination.page * pagination.pageSize,
              pagination.total,
            )} de ${pagination.total} visitantes`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1 || isFetching}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isFetching}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

type ColumnHandlers = {
  onView: (visitor: Visitor) => void;
  onViewAccessAreas: (visitor: Visitor) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
};

const createColumns = ({
  onView,
  onViewAccessAreas,
  onApprove,
  onReject,
  onCancel,
}: ColumnHandlers): ColumnDef<Visitor>[] => [
  {
    header: ({ column }) => {
      return (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Nombre</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      );
    },
    accessorKey: "name",
    cell: ({ row }) => row.original.name,
    enableSorting: true,
  },
  {
    header: "Estado",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    header: ({ column }) => {
      return (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Entrada</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      );
    },
    accessorKey: "entryDate",
    cell: ({ row }) => {
      const date = new Date(row.original.entryDate);
      return (
        <span className="text-sm">
          {date.toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    header: ({ column }) => {
      return (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Salida</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      );
    },
    accessorKey: "exitDate",
    cell: ({ row }) => {
      const date = new Date(row.original.exitDate);
      return (
        <span className="text-sm">
          {date.toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    header: "Accesos",
    accessorKey: "accessAreas",
    cell: ({ row }) => {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewAccessAreas(row.original)}
          className="h-8 text-xs"
        >
          Ver accesos
        </Button>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <ActionsCell
          visitor={row.original}
          onView={onView}
          onApprove={onApprove}
          onReject={onReject}
          onCancel={onCancel}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

type ActionsCellProps = {
  visitor: Visitor;
  onView: (visitor: Visitor) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
};

function ActionsCell({
  visitor,
  onView,
  onApprove,
  onReject,
  onCancel,
}: ActionsCellProps) {
  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: Eye,
      action: () => onView(visitor),
    },
  ];

  if (visitor.status === "pending") {
    items.push(
      {
        label: "Aprobar",
        icon: CheckCircle,
        action: () => onApprove(visitor.id),
      },
      {
        label: "Rechazar",
        icon: XCircle,
        action: () => onReject(visitor.id),
        destructive: true,
      },
    );
  }

  if (visitor.status !== "cancelled") {
    items.push({
      label: "Cancelar",
      icon: Ban,
      action: () => onCancel(visitor.id),
      destructive: true,
    });
  }

  return <ActionMenu items={items} />;
}
