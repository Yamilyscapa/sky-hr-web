import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Location } from "../types";

type LocationDetailsDialogProps = {
  location: Location | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LocationDetailsDialog({
  location,
  open,
  onOpenChange,
}: LocationDetailsDialogProps) {
  if (!location) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{location.name}</DialogTitle>
          <DialogDescription>
            Información de la sucursal seleccionada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Tipo</p>
            <p className="font-medium capitalize">{location.type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            <p className="font-medium">
              {location.active ? "Activa" : "Inactiva"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Coordenadas</p>
            {location.center_latitude && location.center_longitude ? (
              <p className="font-medium">
                {location.center_latitude}, {location.center_longitude}
              </p>
            ) : (
              <p className="font-medium">Sin coordenadas registradas</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Radio</p>
            <p className="font-medium">{location.radius} metros</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Código QR</p>
            <p className="font-medium">
              {location.qr_code_url ? "Disponible" : "No generado"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
