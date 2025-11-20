import { ArrowUpDown, CheckCircle, Eye, FileText, Upload, XCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionMenu } from "@/components/ui/action-menu";
import type { Permission } from "../types";
import { PermissionStatusBadge } from "./PermissionStatusBadge";
import type { UserInfo } from "../utils";
import { formatDateRange } from "../utils";

type ColumnHandlers = {
  usersMap: Map<string, UserInfo>;
  onView: (permission: Permission) => void;
  onApprove: (permission: Permission) => void;
  onReject: (permission: Permission) => void;
  onAddDocuments: (permission: Permission) => void;
};

export const createPermissionColumns = ({
  usersMap,
  onView,
  onApprove,
  onReject,
  onAddDocuments,
}: ColumnHandlers): ColumnDef<Permission>[] => [
  {
    accessorKey: "userId",
    header: ({ column }) => (
      <button
        type="button"
        className="flex items-center gap-2 text-left text-sm font-medium"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Usuario
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      </button>
    ),
    cell: ({ row }) => {
      const userInfo = usersMap.get(row.original.userId);
      if (userInfo) {
        return (
          <div className="space-y-1">
            <p className="font-medium">{userInfo.name}</p>
            <p className="text-xs text-muted-foreground">{userInfo.email}</p>
          </div>
        );
      }
      return (
        <span className="text-muted-foreground">{row.original.userId}</span>
      );
    },
  },
  {
    accessorKey: "message",
    header: ({ column }) => (
      <button
        type="button"
        className="flex items-center gap-2 text-left text-sm font-medium"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Motivo
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      </button>
    ),
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium leading-tight">{row.original.message}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateRange(row.original.startingDate, row.original.endDate)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <PermissionStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "documentsUrl",
    header: "Documentos",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        {row.original.documentsUrl.length} archivo(s)
      </div>
    ),
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => (
      <ActionMenu
        items={[
          {
            label: "Ver detalles",
            icon: Eye,
            action: () => onView(row.original),
          },
          {
            label: "Aprobar",
            icon: CheckCircle,
            action: () => onApprove(row.original),
            disabled: row.original.status !== "pending",
          },
          {
            label: "Rechazar",
            icon: XCircle,
            action: () => onReject(row.original),
            disabled: row.original.status !== "pending",
            destructive: true,
          },
          {
            label: "Agregar documentos",
            icon: Upload,
            action: () => onAddDocuments(row.original),
          },
        ]}
      />
    ),
  },
];
