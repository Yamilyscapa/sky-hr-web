import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { useOrganizationStore } from "@/store/organization-store";
import { Separator } from "@/components/ui/separator";
import { DataTableCard } from "@/components/ui/data-table-card";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { useReactTable } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserX,
  RefreshCw,
  MapPin,
  X,
  Mail,
  Download,
  // Plus, // TODO: Uncomment when create-event endpoint is ready
} from "lucide-react";
import api, { PaginationMeta, extractListData } from "@/api";
import { authClient } from "@/lib/auth-client";
import {
  buildMonthOptions,
  endOfMonth,
  formatMonthLabel,
  formatMonthValue,
  getMonthRangeStrings,
  isWithinRange,
  startOfMonth,
} from "@/lib/month-utils";
import { MonthPaginationControls } from "@/components/month-pagination-controls";

export const Route = createFileRoute("/(company)/attendance")({
  component: RouteComponent,
});

// Type definitions based on API documentation
type AttendanceStatus = "on_time" | "late" | "early" | "absent" | "out_of_bounds";

type AttendanceEvent = {
  id: string;
  user_id: string;
  organization_id: string;
  shift_id: string | null;
  check_in: string; // timestamp
  check_out: string | null; // timestamp
  status: AttendanceStatus;
  is_within_geofence: boolean;
  distance_to_geofence_m: number | null;
  is_verified: boolean;
  source: string; // "qr_face", "manual", "fingerprint", etc.
  latitude: string | null;
  longitude: string | null;
  face_confidence: string | null;
  liveness_score?: string | null;
  spoof_flag: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  work_duration_minutes?: number; // Calculated field
};

type UserInfo = {
  id: string;
  name: string;
  email: string;
};

const PAGE_SIZE = 20;
function StatusBadge({ status }: { status: AttendanceStatus }) {
  const statusConfig = {
    on_time: {
      label: "A tiempo",
      className: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
    },
    late: {
      label: "Tarde",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
    },
    early: {
      label: "Temprano",
      className: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Clock,
    },
    absent: {
      label: "Ausente",
      className: "bg-red-100 text-red-800 border-red-200",
      icon: UserX,
    },
    out_of_bounds: {
      label: "Fuera de área",
      className: "bg-red-100 text-red-800 border-red-200",
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// Mark Absences Dialog Component
function MarkAbsencesDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !emails.includes(trimmedEmail)) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(trimmedEmail)) {
        setEmails([...emails, trimmedEmail]);
        setEmailInput("");
      } else {
        alert("Por favor, ingresa un email válido");
      }
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail(emailInput);
    } else if (e.key === ',' && emailInput.trim()) {
      e.preventDefault();
      handleAddEmail(emailInput);
    } else if (e.key === 'Backspace' && !emailInput && emails.length > 0) {
      // Remove last email if backspace is pressed on empty input
      setEmails(emails.slice(0, -1));
    }
  };

  const handleEmailInputBlur = () => {
    if (emailInput.trim()) {
      handleAddEmail(emailInput);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (emails.length === 0 || !date) {
      alert("Por favor, completa los campos requeridos (emails y fecha)");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await api.markAbsences({
        user_ids: emails,
        date,
        notes: notes || undefined,
      });

      const count = result?.data?.marked_count || 0;
      alert(`Se marcaron ${count} usuario(s) como ausente(s)`);
      setEmails([]);
      setEmailInput("");
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking absences:", error);
      alert(error instanceof Error ? error.message : "Error al marcar ausencias. Por favor, intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar ausencias</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emails">Emails de empleados *</Label>

              {/* Tags display area */}
              {emails.length > 0 && (
                <div className="border rounded-md p-3 bg-gray-50/50 max-h-[150px] overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {emails.map((email, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Input field */}
              <Input
                id="emails"
                type="email"
                placeholder={emails.length === 0 ? "Escribe un email y presiona Enter o coma" : "Agregar más emails..."}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailInputKeyDown}
                onBlur={handleEmailInputBlur}
                className="h-10"
              />

              <p className="text-xs text-muted-foreground">
                Presiona Enter o coma para agregar cada email. Click en la X para remover.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Motivo de la ausencia..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Marcando..." : "Marcar ausencias"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Update Status Dialog Component
function UpdateStatusDialog({
  event,
  open,
  onOpenChange,
  onUpdate,
}: {
  event: AttendanceEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(event.status);
  const [notes, setNotes] = useState(event.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.updateAttendanceStatus(event.id, { status, notes });

      alert("Estado actualizado exitosamente");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error al actualizar el estado. Por favor, intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar estado de asistencia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="on_time">A tiempo</option>
                <option value="late">Tarde</option>
                <option value="early">Temprano</option>
                <option value="absent">Ausente</option>
                <option value="out_of_bounds">Fuera de área</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Agregar notas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Event Details Dialog Component
function EventDetailsDialog({
  event,
  open,
  onOpenChange,
  usersMap,
}: {
  event: AttendanceEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usersMap: Map<string, UserInfo>;
}) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles de asistencia</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Usuario</p>
              {usersMap.get(event.user_id) ? (
                <div>
                  <p className="text-sm font-medium">{usersMap.get(event.user_id)?.name}</p>
                  <p className="text-xs text-gray-500">{usersMap.get(event.user_id)?.email}</p>
                </div>
              ) : (
                <p className="text-sm">{event.user_id}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <StatusBadge status={event.status} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha</p>
              <p className="text-sm">{formatDate(event.check_in)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Verificado</p>
              <p className="text-sm">
                {event.is_verified ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Sí
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> No
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Entrada</p>
              <p className="text-sm">{formatTime(event.check_in)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Salida</p>
              <p className="text-sm">
                {event.check_out ? formatTime(event.check_out) : "-"}
              </p>
            </div>
            {event.work_duration_minutes && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Duración de trabajo
                </p>
                <p className="text-sm">{event.work_duration_minutes} minutos</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Dentro de área</p>
              <p className="text-sm">
                {event.is_within_geofence ? (
                  <span className="text-green-600">Sí</span>
                ) : (
                  <span className="text-red-600">No</span>
                )}
              </p>
            </div>
            {event.distance_to_geofence_m !== null && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Distancia al área
                </p>
                <p className="text-sm">{event.distance_to_geofence_m}m</p>
              </div>
            )}
            {event.face_confidence && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Confianza facial
                </p>
                <p className="text-sm">{event.face_confidence}%</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Fuente</p>
              <p className="text-sm">{event.source}</p>
            </div>
            {event.spoof_flag && (
              <div className="col-span-2">
                <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Alerta de suplantación detectada
                </p>
              </div>
            )}
          </div>
          {event.notes && (
            <div>
              <p className="text-sm font-medium text-gray-500">Notas</p>
              <p className="text-sm bg-gray-50 p-2 rounded">{event.notes}</p>
            </div>
          )}
          {event.latitude && event.longitude && (
            <div>
              <p className="text-sm font-medium text-gray-500">Coordenadas</p>
              <p className="text-sm">
                {event.latitude}, {event.longitude}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionsCell({
  event,
  onViewDetails,
  onUpdateStatus,
  onViewMap,
}: {
  event: AttendanceEvent;
  onViewDetails: (event: AttendanceEvent) => void;
  onUpdateStatus: (event: AttendanceEvent) => void;
  onViewMap?: (event: AttendanceEvent) => void;
}) {
  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: Eye,
      action: () => onViewDetails(event),
    },
    {
      label: "Actualizar estado",
      icon: Edit,
      action: () => onUpdateStatus(event),
    },
  ];

  if (event.latitude && event.longitude && onViewMap) {
    items.push({
      label: "Ver en mapa",
      icon: MapPin,
      action: () => onViewMap(event),
    });
  }

  return <ActionMenu items={items} />;
}

function createColumns(
  onViewDetails: (event: AttendanceEvent) => void,
  onUpdateStatus: (event: AttendanceEvent) => void,
  usersMap: Map<string, UserInfo>,
  onViewMap?: (event: AttendanceEvent) => void,
): ColumnDef<AttendanceEvent>[] {
  return [
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
      header: ({ column }) => {
        return (
          <button
            className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Usuario</span>
            <ArrowUpDown className="h-4 w-4" />
          </button>
        );
      },
      accessorKey: "user_id",
      cell: ({ row }) => {
        const userId = row.original.user_id;
        const userInfo = usersMap.get(userId);
        
        if (userInfo) {
          return (
            <div className="flex flex-col">
              <span className="font-medium">{userInfo.name}</span>
              <span className="text-xs text-gray-500">{userInfo.email}</span>
            </div>
          );
        }
        
        return <span className="text-gray-400">{userId}</span>;
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
            <span>Fecha</span>
            <ArrowUpDown className="h-4 w-4" />
          </button>
        );
      },
      accessorKey: "check_in",
      cell: ({ row }) => {
        const date = new Date(row.original.check_in);
        return date.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      },
      enableSorting: true,
    },
    {
      header: "Entrada",
      accessorKey: "check_in",
      cell: ({ row }) => {
        const time = new Date(row.original.check_in).toLocaleTimeString(
          "es-ES",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );
        return <span>{time}</span>;
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
        return <StatusBadge status={row.original.status} />;
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
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function RouteComponent() {
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEvent | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [markAbsencesDialogOpen, setMarkAbsencesDialogOpen] = useState(false);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [usersMap, setUsersMap] = useState<Map<string, UserInfo>>(new Map());
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { organization } = useOrganizationStore();

  const handleViewDetails = (event: AttendanceEvent) => {
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  const handleUpdateStatus = (event: AttendanceEvent) => {
    setSelectedEvent(event);
    setUpdateDialogOpen(true);
  };

  const handleViewEventMap = (event: AttendanceEvent) => {
    if (!event.latitude || !event.longitude) {
      alert("Este evento no tiene coordenadas registradas.");
      return;
    }

    const url = `https://www.google.com/maps?q=${event.latitude},${event.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const columns = createColumns(
    handleViewDetails,
    handleUpdateStatus,
    usersMap,
    handleViewEventMap,
  );
  const selectedMonthValue = formatMonthValue(selectedMonth);
  const monthOptions = useMemo(
    () => buildMonthOptions(selectedMonth),
    [selectedMonth],
  );
  const currentMonthValue = formatMonthValue(startOfMonth(new Date()));
  const isNextMonthDisabled = selectedMonthValue >= currentMonthValue;
  const selectedMonthLabel = formatMonthLabel(selectedMonth);

  const table = useReactTable({
    data: attendanceEvents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  const getSelectedEvents = () => table.getSelectedRowModel().rows.map((row) => row.original);

  const handleBulkExportCsv = () => {
    const selected = getSelectedEvents();
    if (selected.length === 0) {
      alert("Selecciona al menos un evento.");
      return;
    }

    const headers = [
      "Usuario",
      "Email",
      "Fecha",
      "Entrada",
      "Salida",
      "Estado",
      "Verificado",
      "Notas",
    ];

    const rows = selected.map((event) => {
      const userInfo = usersMap.get(event.user_id);
      const checkInDate = new Date(event.check_in);
      const dateString = checkInDate.toLocaleDateString("es-ES");
      const checkInTime = checkInDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const checkOutTime = event.check_out
        ? new Date(event.check_out).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const values = [
        userInfo?.name || "",
        userInfo?.email || "",
        dateString,
        checkInTime,
        checkOutTime,
        event.status,
        event.is_verified ? "Sí" : "No",
        event.notes || "",
      ];

      return values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asistencia-${selectedMonthValue}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkMarkAbsent = async () => {
    const selected = getSelectedEvents();
    if (selected.length === 0) {
      alert("Selecciona al menos un evento.");
      return;
    }

    if (
      !window.confirm(
        `¿Deseas marcar ${selected.length} evento(s) como ausente? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      await Promise.all(
        selected.map((event) =>
          api.updateAttendanceStatus(event.id, {
            status: "absent",
            notes: event.notes || "Actualizado de forma masiva",
          }),
        ),
      );
      alert("Eventos actualizados correctamente");
      table.resetRowSelection();
      fetchAttendanceData(currentPage, selectedMonth);
    } catch (error) {
      console.error("Error updating events:", error);
      alert("No se pudieron actualizar los eventos seleccionados.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const attendanceBulkActions: ActionMenuItem[] = [
    {
      label: "Exportar CSV",
      icon: Download,
      action: handleBulkExportCsv,
      disabled: isBulkProcessing,
    },
    {
      label: "Marcar como ausentes",
      icon: UserX,
      action: handleBulkMarkAbsent,
      destructive: true,
      disabled: isBulkProcessing,
    },
  ];

  async function fetchOrganizationMembers() {
    try {
      const membersResult = await authClient.organization.listMembers();
      const members = membersResult.data?.members || [];
      
      const userMap = new Map<string, UserInfo>();
      members.forEach((member: any) => {
        if (member.user?.id) {
          userMap.set(member.user.id, {
            id: member.user.id,
            name: member.user.name || member.user.email || "Unknown",
            email: member.user.email || "",
          });
        }
      });
      
      setUsersMap(userMap);
      console.log("Loaded users map:", userMap);
    } catch (error) {
      console.error("Error fetching organization members:", error);
    }
  }

  async function fetchAttendanceData(page = 1, monthDate = selectedMonth) {
    if (!organization?.id) {
      return;
    }

    setIsLoading(true);

    try {
      const { startDate, endDate } = getMonthRangeStrings(monthDate);
      // Fetch both report (flagged events) and all events in parallel
      const [reportResult, eventsResult] = await Promise.all([
        api.getAttendanceReport(),
        api.getAttendanceEvents({
          page,
          pageSize: PAGE_SIZE,
          start_date: startDate,
          end_date: endDate,
        }),
      ]);

      console.log("Attendance report result:", reportResult);
      console.log("Attendance events result:", eventsResult);
      
      // Process flagged events from report
      if (reportResult?.data) {
        const flaggedEvents = Array.isArray(reportResult.data.flagged_events)
          ? reportResult.data.flagged_events
          : [];
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const filteredFlagged = flaggedEvents.filter((event: AttendanceEvent) =>
          isWithinRange(event.check_in, start, end),
        );
        setFlaggedCount(filteredFlagged.length);
      }

      // Process all events for the table
      const events = extractListData<AttendanceEvent>(eventsResult);
      setAttendanceEvents(events);

      const paginationMeta = eventsResult?.pagination ?? null;
      setPagination(paginationMeta);
      setCurrentPage(paginationMeta?.page ?? page);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setIsLoading(false);
    }

  }

  const handlePageChange = (nextPage: number) => {
    if (!pagination) {
      return;
    }
    const totalPages = pagination.totalPages ?? 1;
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
      return;
    }
    fetchAttendanceData(nextPage, selectedMonth);
  };

  useEffect(() => {
    if (organization?.id) {
      fetchOrganizationMembers();
    }
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) {
      setCurrentPage(1);
      fetchAttendanceData(1, selectedMonth);
    }
  }, [organization?.id, selectedMonth]);

  const handleUpdateComplete = () => {
    fetchAttendanceData(currentPage, selectedMonth);
  };

  const handlePreviousMonth = () => {
    setSelectedMonth((prev) => {
      const prevMonth = startOfMonth(prev);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      return startOfMonth(prevMonth);
    });
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) {
      return;
    }
    setSelectedMonth((prev) => {
      const nextMonth = startOfMonth(prev);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return startOfMonth(nextMonth);
    });
  };

  const handleSelectMonth = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return;
    const newDate = startOfMonth(new Date(year, month - 1, 1));
    setSelectedMonth(newDate);
  };

  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Panel de asistencia</CardTitle>
              <p className="text-sm text-muted-foreground">
                Mostrando datos de {selectedMonthLabel}
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <MonthPaginationControls
                selectedValue={selectedMonthValue}
                options={monthOptions}
                onPrevious={handlePreviousMonth}
                onNext={handleNextMonth}
                onSelect={handleSelectMonth}
                disableNext={isNextMonthDisabled}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAttendanceData(currentPage, selectedMonth)}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                  />
                  Actualizar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setMarkAbsencesDialogOpen(true)}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Marcar ausencias
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Eventos marcados</h3>
              </div>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {flaggedCount}
              </p>
              <p className="text-sm text-red-700 mt-1">
                Asistencias que requieren atención
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Tarde</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {attendanceEvents.filter((e) => e.status === "late").length}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Llegadas fuera de horario
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Ausente</h3>
              </div>
              <p className="text-3xl font-bold text-gray-600 mt-2">
                {attendanceEvents.filter((e) => e.status === "absent").length}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Sin registro de asistencia
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <DataTableCard
        title="Eventos de asistencia marcados"
        table={table}
        selectedCount={table.getSelectedRowModel().rows.length}
        bulkActionLabel="Acciones masivas"
        bulkActions={attendanceBulkActions}
      />

      {pagination && (
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando{" "}
            {Math.min(
              (pagination.page - 1) * pagination.pageSize + 1,
              pagination.total,
            )}
            {" "}
            -
            {" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            {" "}
            de {pagination.total} registros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pagination.page >= (pagination.totalPages ?? pagination.page) ||
                isLoading
              }
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <MarkAbsencesDialog
        open={markAbsencesDialogOpen}
        onOpenChange={setMarkAbsencesDialogOpen}
        onComplete={handleUpdateComplete}
      />

      {selectedEvent && (
        <>
          <EventDetailsDialog
            event={selectedEvent}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            usersMap={usersMap}
          />
          <UpdateStatusDialog
            event={selectedEvent}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            onUpdate={handleUpdateComplete}
          />
        </>
      )}
    </div>
  );
}
