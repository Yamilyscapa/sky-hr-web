import { isAuthenticated } from "@/server/auth.server";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DataTableCard } from "@/components/ui/data-table-card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { useReactTable } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Edit,
  Trash2,
  Eye,
  Clock,
  MapPin,
  Copy,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import API, { extractListData } from "@/api";
import { useUserStore } from "@/store/user-store";
import { useOrganizationStore } from "@/store/organization-store";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";

type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  days_of_week: string[];
};

type Geofence = {
  id: string;
  name: string;
  type: string;
  center_latitude: string;
  center_longitude: string;
  radius: number;
  active: boolean;
  qr_code_url?: string;
};

type Employee = {
  id?: string;
  email: string;
  name: string;
  isCurrentUser?: boolean;
  status: "active" | "pending";
  invitationId?: string;
  shift?: {
    id: string;
    name: string;
    color: string;
  };
  geofences?: Geofence[];
  role?: string;
};

type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  inviterId?: string;
  expiresAt?: string;
  createdAt?: string;
};

const formatShortDate = (value?: string | Date) => {
  if (!value) {
    return "Sin fecha";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

// Shift cell component with assignment dialog
function ShiftCell({
  employee,
  shifts,
  onAssignShift,
}: {
  employee: Employee;
  shifts: Shift[];
  onAssignShift: (employeeId: string, shiftId: string, effectiveFrom: string, effectiveUntil?: string) => void;
}) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = employee.status === "pending";
  const shift = employee.shift;

  useEffect(() => {
    if (assignDialogOpen) {
      // Set default effective from date to today
      const today = new Date().toISOString().split("T")[0];
      setEffectiveFrom(today);
      // Reset other fields
      setSelectedShiftId("");
      setEffectiveUntil("");
    }
  }, [assignDialogOpen]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftId || !effectiveFrom) {
      alert("Por favor selecciona un turno y una fecha de inicio");
      return;
    }

    if (!employee.id) {
      alert("ID de empleado no encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssignShift(employee.id, selectedShiftId, effectiveFrom, effectiveUntil || undefined);
      setAssignDialogOpen(false);
    } catch (error) {
      console.error("Error assigning shift:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine button text and icon
  const buttonContent = shift ? (
    <>
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: shift.color }}
      />
      <span className="truncate">{shift.name}</span>
    </>
  ) : (
    <>
      <Clock className="h-3 w-3 flex-shrink-0" />
      <span>Sin asignar</span>
    </>
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAssignDialogOpen(true)}
        disabled={isPending}
        className="text-gray-700 hover:bg-gray-50 w-32 justify-center gap-1.5 h-8 text-xs"
      >
        {buttonContent}
      </Button>

      {/* Shift Assignment Dialog - only for active employees */}
      {!isPending && (
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {shift ? "Cambiar turno de" : "Asignar turno a"} {employee.name || employee.email}
              </DialogTitle>
              <DialogDescription>
                Selecciona un turno y el periodo de asignación.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignSubmit} className="flex flex-col gap-4">
              <Field>
                <Label htmlFor="shift-select">Turno</Label>
                <select
                  id="shift-select"
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Seleccionar turno...</option>
                  {shifts.map((shiftOption) => (
                    <option key={shiftOption.id} value={shiftOption.id}>
                      {shiftOption.name} ({shiftOption.start_time} - {shiftOption.end_time})
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <Label htmlFor="effective-from">Fecha de inicio</Label>
                <Input
                  id="effective-from"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <Label htmlFor="effective-until">Fecha de fin (opcional)</Label>
                <Input
                  id="effective-until"
                  type="date"
                  value={effectiveUntil}
                  onChange={(e) => setEffectiveUntil(e.target.value)}
                  min={effectiveFrom}
                />
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Asignando..." : shift ? "Cambiar turno" : "Asignar turno"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function EmployeeDetailsDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const geofences = employee.geofences ?? [];
  const statusLabel = employee.status === "active" ? "Activo" : "Pendiente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalles de {employee.name || employee.email}</DialogTitle>
          <DialogDescription>
            Información general del colaborador seleccionado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            <Badge variant={employee.status === "active" ? "secondary" : "outline"}>
              {statusLabel}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Correo</p>
            <p className="font-medium break-all">{employee.email}</p>
          </div>
          {employee.shift && (
            <div>
              <p className="text-sm text-muted-foreground">Turno</p>
              <div className="mt-1 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                <span>{employee.shift.name}</span>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: employee.shift.color }}
                />
              </div>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Ubicaciones</p>
            {geofences.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {geofences.map((geofence) => (
                  <Badge key={geofence.id} variant="outline" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {geofence.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin ubicaciones asignadas</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageEmployeeDialog({
  employee,
  shifts,
  geofences,
  onAssignShift,
  onAssignLocations,
  onRemoveLocation,
  open,
  onOpenChange,
}: {
  employee: Employee;
  shifts: Shift[];
  geofences: Geofence[];
  onAssignShift: (employeeId: string, shiftId: string, effectiveFrom: string, effectiveUntil?: string) => void;
  onAssignLocations: (employeeId: string, geofenceIds: string[], assignAll?: boolean) => void;
  onRemoveLocation: (employeeId: string, geofenceId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {employee.name || employee.email}</DialogTitle>
          <DialogDescription>
            Administra el turno y las ubicaciones asignadas desde aquí.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Turno</p>
            <ShiftCell employee={employee} shifts={shifts} onAssignShift={onAssignShift} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Ubicaciones</p>
            <LocationCell
              employee={employee}
              geofences={geofences}
              onAssignLocations={onAssignLocations}
              onRemoveLocation={onRemoveLocation}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Location cell component with assignment dialog
function LocationCell({
  employee,
  geofences,
  onAssignLocations,
  onRemoveLocation,
}: {
  employee: Employee;
  geofences: Geofence[];
  onAssignLocations: (employeeId: string, geofenceIds: string[], assignAll?: boolean) => void;
  onRemoveLocation: (employeeId: string, geofenceId: string) => void;
}) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGeofenceIds, setSelectedGeofenceIds] = useState<string[]>([]);
  const [assignAll, setAssignAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = employee.status === "pending";
  const employeeGeofences = employee.geofences || [];

  useEffect(() => {
    if (assignDialogOpen) {
      // Pre-select current geofences
      setSelectedGeofenceIds(employeeGeofences.map(g => g.id));
      setAssignAll(false);
    }
  }, [assignDialogOpen]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assignAll && selectedGeofenceIds.length === 0) {
      alert("Por favor selecciona al menos una ubicación o activa 'Asignar todas'");
      return;
    }

    if (!employee.id) {
      alert("ID de empleado no encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssignLocations(employee.id, selectedGeofenceIds, assignAll);
      setAssignDialogOpen(false);
    } catch (error) {
      console.error("Error assigning locations:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckboxChange = (geofenceId: string, checked: boolean) => {
    if (checked) {
      setSelectedGeofenceIds([...selectedGeofenceIds, geofenceId]);
    } else {
      setSelectedGeofenceIds(selectedGeofenceIds.filter(id => id !== geofenceId));
    }
  };

  const handleRemoveClick = async (e: React.MouseEvent, geofenceId: string) => {
    e.stopPropagation();
    if (!employee.id) return;
    
    if (window.confirm("¿Estás seguro de que quieres remover esta ubicación?")) {
      try {
        await onRemoveLocation(employee.id, geofenceId);
      } catch (error) {
        console.error("Error removing location:", error);
      }
    }
  };

  // Determine button content
  const buttonContent = employeeGeofences.length > 0 ? (
    <>
      <MapPin className="h-3 w-3 flex-shrink-0" />
      <span>{employeeGeofences.length} ubicación{employeeGeofences.length !== 1 ? 'es' : ''}</span>
    </>
  ) : (
    <>
      <MapPin className="h-3 w-3 flex-shrink-0" />
      <span>Sin asignar</span>
    </>
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAssignDialogOpen(true)}
        disabled={isPending}
        className="text-gray-700 hover:bg-gray-50 w-36 justify-center gap-1.5 h-8 text-xs"
      >
        {buttonContent}
      </Button>

      {/* Location Assignment Dialog - only for active employees */}
      {!isPending && (
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Asignar ubicaciones a {employee.name || employee.email}
              </DialogTitle>
              <DialogDescription>
                Selecciona las ubicaciones a las que este empleado tendrá acceso.
              </DialogDescription>
            </DialogHeader>
            
            {/* Current assignments */}
            {employeeGeofences.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Ubicaciones actuales:</Label>
                <div className="flex flex-wrap gap-2">
                  {employeeGeofences.map((geofence) => (
                    <Badge 
                      key={geofence.id} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      {geofence.name}
                      <button
                        onClick={(e) => handleRemoveClick(e, geofence.id)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="flex flex-col gap-4">
              {/* Assign All option */}
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-md">
                <Checkbox
                  id="assign-all"
                  checked={assignAll}
                  onCheckedChange={(checked) => {
                    setAssignAll(checked as boolean);
                    if (checked) {
                      setSelectedGeofenceIds([]);
                    }
                  }}
                />
                <label
                  htmlFor="assign-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Asignar todas las ubicaciones ({geofences.length})
                </label>
              </div>

              {/* Individual location selection */}
              {!assignAll && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Seleccionar ubicaciones:</Label>
                  <div className="border rounded-md p-3 space-y-3 max-h-64 overflow-y-auto">
                    {geofences.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No hay ubicaciones disponibles. Crea una ubicación primero.
                      </p>
                    ) : (
                      geofences.map((geofence) => (
                        <div key={geofence.id} className="flex items-start space-x-3">
                          <Checkbox
                            id={geofence.id}
                            checked={selectedGeofenceIds.includes(geofence.id)}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange(geofence.id, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={geofence.id}
                            className="text-sm leading-none cursor-pointer flex-1"
                          >
                            <div className="font-medium">{geofence.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Radio: {geofence.radius}m
                            </div>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || geofences.length === 0}>
                  {isSubmitting ? "Asignando..." : "Asignar ubicaciones"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function PendingInvitationsPanel({
  invitations,
  loading,
  error,
  onCancelInvitation,
  cancellingInvitationId,
}: {
  invitations: PendingInvitation[];
  loading: boolean;
  error: string | null;
  onCancelInvitation: (invitationId: string, email: string) => Promise<void>;
  cancellingInvitationId: string | null;
}) {
  const hasInvites = invitations.length > 0;

  const handleCopyLink = async (invitationId: string) => {
    const url = `${window.location.origin}/accept-invitation?token=${invitationId}`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        alert("Enlace de invitación copiado al portapapeles");
        return;
      } catch (error) {
        console.error("Error copiando enlace:", error);
      }
    }
    window.prompt("Copia el enlace manualmente:", url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Invitaciones pendientes</CardTitle>
          <CardDescription>
            Mantén separadas las invitaciones activas para controlar envíos y cancelaciones rápidamente.
          </CardDescription>
        </div>
        {hasInvites && (
          <Badge variant="secondary" className="capitalize">
            {invitations.length} pendientes
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando invitaciones…</p>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron cargar las invitaciones</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !hasInvites ? (
          <p className="text-sm text-muted-foreground">No hay invitaciones pendientes en este momento.</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{invitation.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Invitado {formatShortDate(invitation.createdAt)}</span>
                    <span>Expira {formatShortDate(invitation.expiresAt)}</span>
                    <Badge variant="outline" className="capitalize">
                      {invitation.role}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopyLink(invitation.id)}
                    className="font-normal gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar enlace
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void onCancelInvitation(invitation.id, invitation.email)}
                    disabled={cancellingInvitationId === invitation.id}
                  >
                    {cancellingInvitationId === invitation.id ? "Cancelando..." : "Cancelar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Actions cell component with dropdown menu
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
}: {
  employee: Employee;
  onViewDetails: (employee: Employee) => void;
  onManageEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onPromoteEmployee: (employee: Employee) => void;
  onDemoteEmployee: (employee: Employee) => void;
  promotingMemberId: string | null;
  demotingMemberId: string | null;
  isDeleting: boolean;
}) {
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
  onAssignShift: (employeeId: string, shiftId: string, effectiveFrom: string, effectiveUntil?: string) => void;
  onAssignLocations: (employeeId: string, geofenceIds: string[], assignAll?: boolean) => void;
  onRemoveLocation: (employeeId: string, geofenceId: string) => void;
  onViewEmployee: (employee: Employee) => void;
  onManageEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onPromoteEmployee: (employee: Employee) => void;
  onDemoteEmployee: (employee: Employee) => void;
  deletingEmployeeId?: string | null;
  promotingMemberId?: string | null;
  demotingMemberId?: string | null;
};

// Define columns as a function so we can pass shifts, geofences, and handlers
const createColumns = ({
  shifts,
  geofences,
  onAssignShift,
  onAssignLocations,
  onRemoveLocation,
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
    header: ({ column }) => {
      return (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Correo</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      );
    },
    accessorKey: "email",
    cell: ({ row }) => {
      const email = row.original.email;
      const isCurrentUser = row.original.isCurrentUser;
      return (
        <div className="flex items-center gap-2">
          <span>{email}</span>
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
    header: "Nombre",
    accessorKey: "name",
    cell: ({ row }) => {
      const name = row.original.name;
      return <p>{name}</p>;
    },
    enableSorting: true,
  },
  {
    header: "Rol",
    accessorKey: "role",
    cell: ({ row }) => {
      const role = row.original.role ?? "miembro";
      const variant = role === "admin" || role === "owner" ? "secondary" : "outline";
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
    cell: ({ row }) => {
      return (
        <ShiftCell
          employee={row.original}
          shifts={shifts}
          onAssignShift={onAssignShift}
        />
      );
    },
  },
  {
    header: "Ubicaciones",
    accessorKey: "geofences",
    cell: ({ row }) => {
      return (
        <LocationCell
          employee={row.original}
          geofences={geofences}
          onAssignLocations={onAssignLocations}
          onRemoveLocation={onRemoveLocation}
        />
      );
    },
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

export const Route = createFileRoute("/_protected/(people)/employees")({
  component: RouteComponent,

  beforeLoad: async () => {
    const auth = await isAuthenticated();
    if (!auth) {
      throw redirect({ to: "/login", search: { redirect: "", token: "" } });
    }
  },
});

function RouteComponent() {
  const [data, setData] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null);
  const [manageEmployee, setManageEmployee] = useState<Employee | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [promotingMemberId, setPromotingMemberId] = useState<string | null>(null);
  const [demotingMemberId, setDemotingMemberId] = useState<string | null>(null);
  const { user } = useUserStore();
  const { organization } = useOrganizationStore();

  // Handler for assigning shift
  const handleAssignShift = async (
    employeeId: string,
    shiftId: string,
    effectiveFrom: string,
    effectiveUntil?: string
  ) => {
    try {
      // Convert date to ISO string
      const effectiveFromISO = new Date(effectiveFrom).toISOString();
      const effectiveUntilISO = effectiveUntil
        ? new Date(effectiveUntil).toISOString()
        : undefined;

      const response = await API.assignShift({
        user_id: employeeId,
        shift_id: shiftId,
        effective_from: effectiveFromISO,
        effective_until: effectiveUntilISO,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert("Turno asignado exitosamente");
      
      // Refresh the employee list to show updated shift
      await handleUsersList();
    } catch (error) {
      console.error("Error assigning shift:", error);
      alert("Error al asignar el turno. Por favor, intenta de nuevo.");
      throw error;
    }
  };

  // Handler for assigning locations
  const handleAssignLocations = async (
    employeeId: string,
    geofenceIds: string[],
    assignAll?: boolean
  ) => {
    try {
      const response = await API.assignGeofencesToUser({
        user_id: employeeId,
        geofence_ids: assignAll ? undefined : geofenceIds,
        assign_all: assignAll,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert("Ubicaciones asignadas exitosamente");
      
      // Refresh the employee list to show updated locations
      await handleUsersList();
    } catch (error) {
      console.error("Error assigning locations:", error);
      alert("Error al asignar las ubicaciones. Por favor, intenta de nuevo.");
      throw error;
    }
  };

  // Handler for removing a location
  const handleRemoveLocation = async (employeeId: string, geofenceId: string) => {
    try {
      const response = await API.removeGeofenceFromUser({
        user_id: employeeId,
        geofence_id: geofenceId,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert("Ubicación removida exitosamente");
      
      // Refresh the employee list to show updated locations
      await handleUsersList();
    } catch (error) {
      console.error("Error removing location:", error);
      alert("Error al remover la ubicación. Por favor, intenta de nuevo.");
      throw error;
    }
  };

  const handleViewEmployeeDetails = (employee: Employee) => {
    setDetailsEmployee(employee);
  };

  const handleManageEmployee = (employee: Employee) => {
    if (employee.status === "pending") {
      alert("No puedes editar una invitación pendiente.");
      return;
    }
    setManageEmployee(employee);
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!employee.id && !employee.email) {
      alert("No se encontró el identificador del empleado.");
      return;
    }

    if (employee.role === "owner") {
      alert("No puedes eliminar al propietario de la organización.");
      return;
    }

    if (!window.confirm(`¿Deseas eliminar a ${employee.name || employee.email}?`)) {
      return;
    }

    const identifier = employee.id || employee.email;
    setDeletingEmployeeId(employee.id ?? null);
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: identifier,
        organizationId: organization?.id,
      });
      alert("Empleado eliminado exitosamente");
      await handleUsersList();
    } catch (error) {
      console.error("Error eliminando empleado:", error);
      alert("Error al eliminar el empleado. Por favor, intenta de nuevo.");
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const handleUpdateMemberRole = async (employee: Employee, targetRole: "admin" | "member") => {
    if (!employee.id) {
      alert("ID de empleado no encontrado.");
      return;
    }
    if (employee.role === "owner") {
      alert("No puedes cambiar el rol del propietario.");
      return;
    }
    if (employee.role === targetRole) {
      return;
    }

    const setLoading = targetRole === "admin" ? setPromotingMemberId : setDemotingMemberId;
    setLoading(employee.id);
    try {
      await authClient.organization.updateMemberRole({
        memberId: employee.id,
        role: targetRole,
        organizationId: organization?.id,
      });
      alert(
        targetRole === "admin"
          ? "Empleado promovido a administrador"
          : "Empleado degradado a miembro",
      );
      await handleUsersList();
    } catch (error) {
      console.error("Error actualizando rol:", error);
      alert("No se pudo actualizar el rol. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  };

  const handlePromoteEmployee = (employee: Employee) =>
    handleUpdateMemberRole(employee, "admin");

  const handleDemoteEmployee = (employee: Employee) =>
    handleUpdateMemberRole(employee, "member");

  const columns = createColumns({
    shifts,
    geofences,
    onAssignShift: handleAssignShift,
    onAssignLocations: handleAssignLocations,
    onRemoveLocation: handleRemoveLocation,
    onViewEmployee: handleViewEmployeeDetails,
    onManageEmployee: handleManageEmployee,
    onDeleteEmployee: handleDeleteEmployee,
    onPromoteEmployee: handlePromoteEmployee,
    onDemoteEmployee: handleDemoteEmployee,
    deletingEmployeeId,
    promotingMemberId,
    demotingMemberId,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  const getSelectedEmployees = () => table.getSelectedRowModel().rows.map((row) => row.original);

  const handleBulkRemoveEmployees = async () => {
    const selectedEmployees = getSelectedEmployees();
    if (selectedEmployees.length === 0) {
      alert("Selecciona al menos un empleado.");
      return;
    }

    const pendingInvites = selectedEmployees.filter(
      (employee) => employee.status === "pending" && employee.invitationId,
    );
    const activeMembers = selectedEmployees.filter(
      (employee) => employee.status === "active" && (employee.id || employee.email),
    );

    if (pendingInvites.length === 0 && activeMembers.length === 0) {
      alert("No hay acciones disponibles para los registros seleccionados.");
      return;
    }

    if (
      !window.confirm(
        `¿Deseas procesar ${selectedEmployees.length} registro(s)? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      await Promise.all([
        ...pendingInvites.map((employee) =>
          employee.invitationId
            ? authClient.organization.cancelInvitation({
                invitationId: employee.invitationId,
              })
            : Promise.resolve(),
        ),
        ...activeMembers.map((employee) =>
          authClient.organization.removeMember({
            memberIdOrEmail: employee.id || employee.email,
            organizationId: organization?.id,
          }),
        ),
      ]);
      alert("Acciones masivas completadas");
      await handleUsersList();
      table.resetRowSelection();
    } catch (error) {
      console.error("Error al ejecutar la acción masiva:", error);
      alert("Ocurrió un error. Por favor, intenta de nuevo.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkCopyEmails = async () => {
    const selectedEmployees = getSelectedEmployees();
    if (selectedEmployees.length === 0) {
      alert("Selecciona al menos un empleado.");
      return;
    }

    const emails = Array.from(
      new Set(
        selectedEmployees
          .map((employee) => employee.email)
          .filter((email): email is string => Boolean(email)),
      ),
    );

    if (emails.length === 0) {
      alert("Los registros seleccionados no tienen correos disponibles.");
      return;
    }

    const emailString = emails.join(", ");
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(emailString);
        alert("Correos copiados al portapapeles");
        return;
      } catch (error) {
        console.error("Error copiando correos:", error);
      }
    }

    window.prompt("Copia los correos manualmente:", emailString);
  };

  const employeeBulkActions: ActionMenuItem[] = [
    {
      label: "Eliminar seleccionados",
      icon: Trash2,
      action: handleBulkRemoveEmployees,
      destructive: true,
      disabled: isBulkProcessing,
    },
    {
      label: "Copiar correos",
      icon: Copy,
      action: handleBulkCopyEmails,
      disabled: isBulkProcessing,
    },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const email =
      (form.querySelector("#employee-email") as HTMLInputElement)?.value ?? "";
    const result = await authClient.organization.inviteMember({
      email,
      role: "member",
    });

    if (result.error) {
      console.error(result.error);
    } else {
      console.log(result.data);
      // Refresh the list to show the new pending invitation
      await handleUsersList();
      // Clear the form
      form.reset();
    }
  }

  async function fetchShifts() {
    try {
      const response = await API.getShifts();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      let shiftsList: Shift[] = [];

      if (Array.isArray(result)) {
        shiftsList = result;
      } else if (result.data && Array.isArray(result.data)) {
        shiftsList = result.data;
      }

      setShifts(shiftsList);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  }

  async function fetchGeofences() {
    if (!organization?.id) {
      return;
    }

    try {
      const response = await API.getGeofencesByOrganization(organization.id);
      const geofencesList = extractListData<Geofence>(response);
      setGeofences(geofencesList);
    } catch (error) {
      console.error("Error fetching geofences:", error);
    }
  }

  const refreshInvitations = async () => {
    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
    const invitationsResult = await authClient.organization.listInvitations();
    const invitationsPayload = invitationsResult.data as any;
    const invitationsList = Array.isArray(invitationsPayload)
      ? invitationsPayload
      : Array.isArray(invitationsPayload?.invitations)
      ? invitationsPayload.invitations
      : [];
      const pendingList = invitationsList
        .filter((invitation: any) => invitation.status === "pending")
        .map((invitation: any) => ({
          id: invitation.id,
          email: invitation.email ?? "",
          role: invitation.role ?? "member",
          status: invitation.status ?? "pending",
          inviterId: invitation.inviterId ?? invitation.inviter_id,
          expiresAt: invitation.expiresAt ?? invitation.expires_at,
          createdAt: invitation.createdAt ?? invitation.created_at,
        }));
      setPendingInvitations(pendingList);
    } catch (error) {
      console.error("Error fetching invitaciones:", error);
      setInvitationsError("No pudimos cargar las invitaciones. Inténtalo de nuevo.");
      setPendingInvitations([]);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const refreshMembers = async () => {
    const currentUserEmail = user?.email;
    try {
      const membersResult = await authClient.organization.listMembers();
      const activeMembers: Employee[] =
        membersResult.data?.members?.map((member) => ({
          id: member.user?.id ?? "",
          email: member.user?.email ?? "",
          name: member.user?.name ?? "",
          isCurrentUser: currentUserEmail
            ? member.user?.email === currentUserEmail
            : false,
          status: "active",
          role: member.role ?? "member",
        })) ?? [];

      const membersWithShiftsAndGeofences = await Promise.all(
        activeMembers.map(async (member) => {
          if (!member.id) return member;

          let memberData = { ...member };

          try {
            const scheduleResponse = await API.getUserSchedule(member.id);
            if (scheduleResponse.ok) {
              const scheduleResult = await scheduleResponse.json();
              let schedules = [];

              if (Array.isArray(scheduleResult)) {
                schedules = scheduleResult;
              } else if (scheduleResult.data && Array.isArray(scheduleResult.data)) {
                schedules = scheduleResult.data;
              }

              const now = new Date();
              const activeSchedules = schedules.filter((schedule: any) => {
                const effectiveFrom = new Date(schedule.effective_from);
                const effectiveUntil = schedule.effective_until
                  ? new Date(schedule.effective_until)
                  : null;

                return (
                  effectiveFrom <= now &&
                  (!effectiveUntil || effectiveUntil >= now)
                );
              });

              const activeSchedule = activeSchedules.sort((a: any, b: any) => {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                return dateB.getTime() - dateA.getTime();
              })[0];

              if (activeSchedule && activeSchedule.shift_id) {
                const shift = shifts.find((s) => s.id === activeSchedule.shift_id);
                if (shift) {
                  memberData = {
                    ...memberData,
                    shift: {
                      id: shift.id,
                      name: shift.name,
                      color: shift.color,
                    },
                  };
                }
              }
            }

            const geofencesResponse = await API.getUserGeofences(member.id);
            if (geofencesResponse.ok) {
              const geofencesResult = await geofencesResponse.json();
              let userGeofences: Geofence[] = [];

              if (
                geofencesResult.data?.assignments &&
                Array.isArray(geofencesResult.data.assignments)
              ) {
                userGeofences = geofencesResult.data.assignments
                  .map((assignment: any) => assignment.geofence)
                  .filter((g: any) => g);
              } else if (Array.isArray(geofencesResult)) {
                userGeofences = geofencesResult;
              } else if (geofencesResult.data && Array.isArray(geofencesResult.data)) {
                userGeofences = geofencesResult.data;
              }

              memberData = {
                ...memberData,
                geofences: userGeofences,
              };
            }
          } catch (error) {
            console.error(`Error fetching data for user ${member.id}:`, error);
          }

          return memberData;
        }),
      );

      setData(membersWithShiftsAndGeofences);
    } catch (error) {
      console.error("Error fetching miembros:", error);
      setData([]);
    }
  };

  async function handleUsersList() {
    await Promise.all([refreshMembers(), refreshInvitations()]);
  }

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!window.confirm(`¿Deseas cancelar la invitación para ${email}?`)) {
      return;
    }
    setCancellingInvitationId(invitationId);
    try {
      await authClient.organization.cancelInvitation({ invitationId });
      alert("Invitación cancelada exitosamente");
      await refreshInvitations();
    } catch (error) {
      console.error("Error cancelando invitación:", error);
      alert("Error al cancelar la invitación. Por favor, intenta de nuevo.");
    } finally {
      setCancellingInvitationId(null);
    }
  };

  useEffect(() => {
    if (user && organization?.id) {
      fetchShifts();
      fetchGeofences();
    }
  }, [user, organization?.id]);

  useEffect(() => {
    if (user && shifts.length > 0 && geofences.length >= 0) {
      handleUsersList();
    }
  }, [user, shifts, geofences, organization?.id]);

  useEffect(() => {
    if (user) {
      refreshInvitations();
    }
  }, [user]);

  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>Agregar empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <Label htmlFor="employee-email">Correo electrónico</Label>
              <Input
                id="employee-email"
                type="email"
                placeholder="correo@ejemplo.com"
              />
            </Field>
            <Button type="submit">Enviar invitación</Button>
          </form>
        </CardContent>
      </Card>

      <PendingInvitationsPanel
        invitations={pendingInvitations}
        loading={invitationsLoading}
        error={invitationsError}
        onCancelInvitation={handleCancelInvitation}
        cancellingInvitationId={cancellingInvitationId}
      />

      <Separator className="mt-8" />
      <DataTableCard
        title="Empleados"
        table={table}
        selectedCount={table.getSelectedRowModel().rows.length}
        bulkActionLabel="Acciones masivas"
        bulkActions={employeeBulkActions}
        className="mt-8"
      />

      {detailsEmployee && (
        <EmployeeDetailsDialog
          employee={detailsEmployee}
          open={Boolean(detailsEmployee)}
          onOpenChange={(open) => {
            if (!open) {
              setDetailsEmployee(null);
            }
          }}
        />
      )}

      {manageEmployee && manageEmployee.status === "active" && (
        <ManageEmployeeDialog
          employee={manageEmployee}
          shifts={shifts}
          geofences={geofences}
          onAssignShift={handleAssignShift}
          onAssignLocations={handleAssignLocations}
          onRemoveLocation={handleRemoveLocation}
          open={Boolean(manageEmployee)}
          onOpenChange={(open) => {
            if (!open) {
              setManageEmployee(null);
            }
          }}
        />
      )}
    </div>
  );
}
