import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useOrganizationStore } from "@/store/organization-store";
import { Separator } from "@/components/ui/separator";
import { DataTableCard } from "@/components/ui/data-table-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
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
  // Plus, // TODO: Uncomment when create-event endpoint is ready
} from "lucide-react";
import api from "@/api";

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

// API Response type for reference (handled inline in component)
// type AttendanceReportResponse = {
//   message: string;
//   data: {
//     total_records?: number;
//     events?: AttendanceEvent[];
//     flagged_events?: AttendanceEvent[]; // Legacy support
//     flagged_count?: number; // Legacy support
//     summary?: {
//       on_time: number;
//       late: number;
//       absent: number;
//       early: number;
//       out_of_bounds?: number;
//     };
//   };
// };

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
}: {
  event: AttendanceEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
              <p className="text-sm">{event.user_id}</p>
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
}: {
  event: AttendanceEvent;
  onViewDetails: (event: AttendanceEvent) => void;
  onUpdateStatus: (event: AttendanceEvent) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-md">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onViewDetails(event)}
        >
          <Eye className="h-4 w-4" />
          <span>Ver detalles</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onUpdateStatus(event)}
        >
          <Edit className="h-4 w-4" />
          <span>Actualizar estado</span>
        </DropdownMenuItem>
        {event.latitude && event.longitude && (
          <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
            <MapPin className="h-4 w-4" />
            <span>Ver en mapa</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function createColumns(
  onViewDetails: (event: AttendanceEvent) => void,
  onUpdateStatus: (event: AttendanceEvent) => void
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
      cell: (info) => info.getValue(),
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
  const { organization } = useOrganizationStore();

  const handleViewDetails = (event: AttendanceEvent) => {
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  const handleUpdateStatus = (event: AttendanceEvent) => {
    setSelectedEvent(event);
    setUpdateDialogOpen(true);
  };

  const columns = createColumns(handleViewDetails, handleUpdateStatus);

  const table = useReactTable({
    data: attendanceEvents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  async function fetchAttendanceReport() {
    if (!organization?.id) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await api.getAttendanceReport();
      
      if (result?.data) {
        // Support both old and new API response formats
        const events = result.data.events || result.data.flagged_events || [];
        const count = result.data.total_records || result.data.flagged_count || events.length;
        
        setFlaggedCount(count);
        setAttendanceEvents(events);
      }
    } catch (error) {
      console.error("Error fetching attendance report:", error);
      // Set mock data for development
      const mockEvents: AttendanceEvent[] = [
        {
          id: "1",
          user_id: "juan.perez@example.com",
          organization_id: organization?.id || "",
          shift_id: null,
          check_in: new Date().toISOString(),
          check_out: null,
          status: "out_of_bounds",
          is_within_geofence: false,
          distance_to_geofence_m: 150,
          is_verified: true,
          source: "qr_face",
          latitude: "40.7128",
          longitude: "-74.0060",
          face_confidence: "95.5",
          spoof_flag: false,
          notes: "Checked in outside designated area",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "2",
          user_id: "maria.garcia@example.com",
          organization_id: organization?.id || "",
          shift_id: "shift-1",
          check_in: new Date(Date.now() - 3600000).toISOString(),
          check_out: null,
          status: "late",
          is_within_geofence: true,
          distance_to_geofence_m: 0,
          is_verified: true,
          source: "qr_face",
          latitude: "40.7128",
          longitude: "-74.0060",
          face_confidence: "98.2",
          spoof_flag: false,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "3",
          user_id: "carlos.rodriguez@example.com",
          organization_id: organization?.id || "",
          shift_id: "shift-2",
          check_in: new Date().toISOString(),
          check_out: null,
          status: "absent",
          is_within_geofence: false,
          distance_to_geofence_m: null,
          is_verified: false,
          source: "system",
          latitude: null,
          longitude: null,
          face_confidence: null,
          spoof_flag: false,
          notes: "Auto-marked as absent - No check-in after grace period",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setAttendanceEvents(mockEvents);
      setFlaggedCount(mockEvents.length);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (organization?.id) {
      fetchAttendanceReport();
    }
  }, [organization?.id]);

  function handleBulkAction() {
    const selectedRows = table.getSelectedRowModel().rows;
    console.log(
      "Bulk action on selected rows:",
      selectedRows.map((row) => row.original)
    );
  }

  const handleUpdateComplete = () => {
    fetchAttendanceReport();
  };

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Panel de asistencia</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAttendanceReport}
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
          </CardTitle>
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
        onBulkAction={handleBulkAction}
      />

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

