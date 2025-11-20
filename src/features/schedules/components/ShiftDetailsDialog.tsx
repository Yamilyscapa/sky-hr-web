import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Shift } from "../types";

type ShiftDetailsDialogProps = {
  shift: Shift;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShiftDetailsDialog({
  shift,
  open,
  onOpenChange,
}: ShiftDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{shift.name}</DialogTitle>
          <DialogDescription>
            Detalles del turno seleccionado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            <p className="font-medium">{shift.active ? "Activo" : "Inactivo"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Horario</p>
            <p className="font-medium">
              {shift.start_time} - {shift.end_time}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Días</p>
            <p className="font-medium capitalize">
              {shift.days_of_week.join(", ")}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Descanso</p>
            <p className="font-medium">{shift.break_minutes} minutos</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Color</p>
            {shift.color ? (
              <div className="mt-1 inline-flex items-center gap-2">
                <span
                  className="h-5 w-5 rounded-md border"
                  style={{ backgroundColor: shift.color }}
                />
                <span className="font-medium">{shift.color}</span>
              </div>
            ) : (
              <p className="font-medium">Sin color asignado</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
