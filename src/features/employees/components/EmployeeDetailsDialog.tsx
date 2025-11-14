import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Employee } from "../types";

type EmployeeDetailsDialogProps = {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeeDetailsDialog({
  employee,
  open,
  onOpenChange,
}: EmployeeDetailsDialogProps) {
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
            <Badge
              variant={employee.status === "active" ? "secondary" : "outline"}
            >
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
                  <Badge
                    key={geofence.id}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" />
                    {geofence.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin ubicaciones asignadas
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
