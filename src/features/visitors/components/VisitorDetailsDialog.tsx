import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Visitor } from "../types";
import { StatusBadge } from "./VisitorStatusBadge";

type VisitorDetailsDialogProps = {
  visitor: Visitor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VisitorDetailsDialog({
  visitor,
  open,
  onOpenChange,
}: VisitorDetailsDialogProps) {
  if (!visitor) return null;

  const accessAreas = Array.isArray(visitor.accessAreas)
    ? visitor.accessAreas
    : visitor.accessAreas
      ? [visitor.accessAreas]
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{visitor.name}</DialogTitle>
          <DialogDescription>
            Información detallada del visitante.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            <div className="mt-1">
              <StatusBadge status={visitor.status} />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Fecha y hora de entrada
            </p>
            <p className="font-medium">
              {new Date(visitor.entryDate).toLocaleString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Fecha y hora de salida
            </p>
            <p className="font-medium">
              {new Date(visitor.exitDate).toLocaleString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lugares de acceso</p>
            {accessAreas.length > 0 ? (
              <ul className="list-disc list-inside mt-1 space-y-1">
                {accessAreas.map((area, index) => (
                  <li key={index} className="font-medium capitalize">
                    {area}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-medium text-muted-foreground">
                Sin especificar
              </p>
            )}
          </div>
          {visitor.approvedAt && (
            <div>
              <p className="text-sm text-muted-foreground">Aprobado el</p>
              <p className="font-medium">
                {new Date(visitor.approvedAt).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
