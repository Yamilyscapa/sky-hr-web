import { Edit, Eye, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import type { Employee, Geofence, Shift } from "../types";
import { ShiftCell } from "./ShiftCell";
import { LocationCell } from "./LocationCell";
import { HourlyRateCell } from "./HourlyRateCell";

type ActionsCellProps = {
  employee: Employee;
  onViewDetails: (employee: Employee) => void;
  onManageEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onPromoteEmployee: (employee: Employee) => void;
  onDemoteEmployee: (employee: Employee) => void;
  promotingMemberId: string | null;
  demotingMemberId: string | null;
  isDeleting: boolean;
};

function ActionsCell({
  employee,
  onViewDetails,
  onManageEmployee,
  onDeleteEmployee,
  onPromoteEmployee,
  onDemoteEmployee,
  promotingMemberId,
  demotingMemberId,
  isDeleting,
}: ActionsCellProps) {
  const isOwner = employee.role === "owner";
  const isAdmin = employee.role === "admin";
  const isPromoting = employee.id ? promotingMemberId === employee.id : false;
  const isDemoting = employee.id ? demotingMemberId === employee.id : false;
  const promoteDisabled = isPromoting || isOwner;
  const demoteDisabled = isDemoting || !isAdmin;
  const deleteDisabled = isOwner || isDeleting;

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: Eye,
      action: () => onViewDetails(employee),
    },
    {
      label: "Editar",
      icon: Edit,
      action: () => onManageEmployee(employee),
      disabled: isOwner,
    },
  ];

  if (!isOwner && !isAdmin) {
    items.push({
      label: isPromoting ? "Promoviendo..." : "Promover a admin",
      icon: TrendingUp,
      action: () => onPromoteEmployee(employee),
      disabled: promoteDisabled,
    });
  }

  if (isAdmin) {
    items.push({
      label: isDemoting ? "Degradando..." : "Degradar a miembro",
      icon: TrendingDown,
      action: () => onDemoteEmployee(employee),
      disabled: demoteDisabled,
    });
  }

  items.push({
    label: "Eliminar",
    icon: Trash2,
    action: () => onDeleteEmployee(employee),
    destructive: true,
    disabled: deleteDisabled,
  });

  return <ActionMenu items={items} />;
}

type ColumnBuilderParams = {
  shifts: Shift[];
  geofences: Geofence[];
  onAssignShift: (
    employeeId: string,
    shiftId: string,
    effectiveFrom: string,
    effectiveUntil?: string,
  ) => Promise<void>;
  onAssignLocations: (
    employeeId: string,
    geofenceIds: string[],
    assignAll?: boolean,
  ) => Promise<void>;
  onRemoveLocation: (employeeId: string, geofenceId: string) => Promise<void>;
  onAssignHourlyRate: (
    employeeId: string,
    hourlyRate: number,
    effectiveFrom: string,
    effectiveUntil?: string,
  ) => Promise<void>;
  onViewEmployee: (employee: Employee) => void;
  onManageEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onPromoteEmployee: (employee: Employee) => void;
  onDemoteEmployee: (employee: Employee) => void;
  deletingEmployeeId?: string | null;
  promotingMemberId?: string | null;
  demotingMemberId?: string | null;
};

export const createEmployeeColumns = ({
  shifts,
  geofences,
  onAssignShift,
  onAssignLocations,
  onRemoveLocation,
  onAssignHourlyRate,
  onViewEmployee,
  onManageEmployee,
  onDeleteEmployee,
  onPromoteEmployee,
  onDemoteEmployee,
  deletingEmployeeId,
  promotingMemberId,
  demotingMemberId,
}: ColumnBuilderParams): ColumnDef<Employee>[] => [
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
    enableSorting: true,
    enableHiding: false,
  },
  {
    header: "Nombre",
    accessorKey: "name",
    cell: ({ row }) => {
      const name = row.original.name;
      const isCurrentUser = row.original.isCurrentUser;
      return (
        <div className="flex items-center gap-2">
          <span>{name}</span>
          {isCurrentUser && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              YO
            </span>
          )}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    header: "Rol",
    accessorKey: "role",
    cell: ({ row }) => {
      const role = row.original.role ?? "miembro";
      const variant =
        role === "admin" || role === "owner" ? "secondary" : "outline";
      return (
        <Badge variant={variant} className="capitalize">
          {role}
        </Badge>
      );
    },
    enableSorting: true,
  },
  {
    header: "Turno asignado",
    accessorKey: "shift",
    cell: ({ row }) => (
      <ShiftCell
        employee={row.original}
        shifts={shifts}
        onAssignShift={onAssignShift}
      />
    ),
  },
  {
    header: "Tarifa por hora",
    accessorKey: "hourlyRate",
    cell: ({ row }) => (
      <HourlyRateCell
        employee={row.original}
        onAssignHourlyRate={onAssignHourlyRate}
      />
    ),
  },
  {
    header: "Ubicaciones",
    accessorKey: "geofences",
    cell: ({ row }) => (
      <LocationCell
        employee={row.original}
        geofences={geofences}
        onAssignLocations={onAssignLocations}
        onRemoveLocation={onRemoveLocation}
      />
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const employee = row.original;
      const isDeleting = !!employee.id && employee.id === deletingEmployeeId;
      return (
        <ActionsCell
          employee={employee}
          onViewDetails={onViewEmployee}
          onManageEmployee={onManageEmployee}
          onDeleteEmployee={onDeleteEmployee}
          onPromoteEmployee={onPromoteEmployee}
          onDemoteEmployee={onDemoteEmployee}
          promotingMemberId={promotingMemberId ?? null}
          demotingMemberId={demotingMemberId ?? null}
          isDeleting={Boolean(isDeleting)}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
