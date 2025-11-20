import { useMemo } from "react";
import {
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  useReactTable,
} from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { ArrowUpDown, CheckCircle, Eye, History, MapPin, XCircle } from "lucide-react";
import { AttendanceStatusBadge } from "../components/AttendanceStatusBadge";
import type { AttendanceEvent, UserInfo } from "../types";

type ColumnHandlers = {
  onViewDetails: (event: AttendanceEvent) => void;
  onUpdateStatus: (event: AttendanceEvent) => void;
  onViewMap: (event: AttendanceEvent) => void;
  onViewHistory: (event: AttendanceEvent) => void;
  usersMap: Map<string, UserInfo>;
};

export function useAttendanceTable({
  events,
  handlers,
}: {
  events: AttendanceEvent[];
  handlers: ColumnHandlers;
}) {
  const columns = useMemo(
    () => createColumns(handlers),
    [
      handlers.onViewDetails,
      handlers.onUpdateStatus,
      handlers.onViewMap,
      handlers.onViewHistory,
      handlers.usersMap,
    ],
  );

  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  const getSelectedEvents = () =>
    table.getSelectedRowModel().rows.map((row) => row.original);

  return { table, getSelectedEvents };
}

function createColumns({
  onViewDetails,
  onUpdateStatus,
  onViewMap,
  onViewHistory,
  usersMap,
}: ColumnHandlers): ColumnDef<AttendanceEvent>[] {
  return [
    {
      header: ({ column }) => (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Usuario</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      accessorKey: "user_id",
      cell: ({ row }) => {
        const user = usersMap.get(row.original.user_id);
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {user?.name || row.original.user_id}
            </span>
            {user?.email && (
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: ({ column }) => (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Fecha</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      ),
      accessorKey: "check_in",
      cell: ({ row }) => {
        const date = new Date(row.original.check_in);
        return (
          <div>
            <p className="text-sm">
              {date.toLocaleDateString("es-ES", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {date.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      },
    },
    {
      header: "Salida",
      accessorKey: "check_out",
      cell: ({ row }) => {
        const checkOut = row.original.check_out;
        if (!checkOut) return <span className="text-gray-400">-</span>;
        const time = new Date(checkOut).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return <span>{time}</span>;
      },
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => {
        return <AttendanceStatusBadge status={row.original.status} />;
      },
    },
    {
      header: "Verificado",
      accessorKey: "is_verified",
      cell: ({ row }) => {
        return row.original.is_verified ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <ActionsCell
            event={row.original}
            onViewDetails={onViewDetails}
            onUpdateStatus={onUpdateStatus}
            onViewMap={onViewMap}
            onViewHistory={onViewHistory}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

type ActionsCellProps = {
  event: AttendanceEvent;
  onViewDetails: (event: AttendanceEvent) => void;
  onUpdateStatus: (event: AttendanceEvent) => void;
  onViewMap: (event: AttendanceEvent) => void;
  onViewHistory: (event: AttendanceEvent) => void;
};

function ActionsCell({
  event,
  onViewDetails,
  onUpdateStatus,
  onViewMap,
  onViewHistory,
}: ActionsCellProps) {
  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: Eye,
      action: () => onViewDetails(event),
    },
    {
      label: "Ver historial",
      icon: History,
      action: () => onViewHistory(event),
    },
    {
      label: "Actualizar estado",
      icon: CheckCircle,
      action: () => onUpdateStatus(event),
    },
  ];

  if (event.latitude && event.longitude) {
    items.push({
      label: "Ver en mapa",
      icon: MapPin,
      action: () => onViewMap(event),
    });
  }

  return <ActionMenu items={items} />;
}
