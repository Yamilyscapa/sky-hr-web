import { ArrowUpDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Location } from "../types";
import { LocationActionsCell } from "./LocationActionsCell";
import { LocationQrViewer } from "./LocationQrViewer";

type LocationColumnHandlers = {
  onView: (location: Location) => void;
  onOpenMap: (location: Location) => void;
  onDownloadQr: (location: Location) => void;
};

export const createLocationColumns = ({
  onView,
  onOpenMap,
  onDownloadQr,
}: LocationColumnHandlers): ColumnDef<Location>[] => [
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
    cell: (info) => info.getValue(),
    enableSorting: true,
  },
  {
    header: "Código QR",
    accessorKey: "qr_code_url",
    cell: ({ row }) => (
      <LocationQrViewer location={row.original} onDownload={onDownloadQr} />
    ),
  },
  {
    header: "Radio",
    accessorKey: "radius",
    cell: ({ row }) => <span>{row.original.radius}m</span>,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <LocationActionsCell
        location={row.original}
        onView={onView}
        onOpenMap={onOpenMap}
        onDownloadQr={onDownloadQr}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
