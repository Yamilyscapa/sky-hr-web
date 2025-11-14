import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AttendanceEvent, UserInfo } from "../types";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";

type EventDetailsDialogProps = {
  event: AttendanceEvent;
  usersMap: Map<string, UserInfo>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EventDetailsDialog({
  event,
  usersMap,
  open,
  onOpenChange,
}: EventDetailsDialogProps) {
  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const userInfo = usersMap.get(event.user_id);

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
              {userInfo ? (
                <div>
                  <p className="text-sm font-medium">{userInfo.name}</p>
                  <p className="text-xs text-gray-500">{userInfo.email}</p>
                </div>
              ) : (
                <p className="text-sm">{event.user_id}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <AttendanceStatusBadge status={event.status} />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
