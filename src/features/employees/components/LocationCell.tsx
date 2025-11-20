import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Employee, Geofence } from "../types";

type LocationCellProps = {
  employee: Employee;
  geofences: Geofence[];
  onAssignLocations: (
    employeeId: string,
    geofenceIds: string[],
    assignAll?: boolean,
  ) => Promise<void>;
  onRemoveLocation: (employeeId: string, geofenceId: string) => Promise<void>;
};

export function LocationCell({
  employee,
  geofences,
  onAssignLocations,
  onRemoveLocation,
}: LocationCellProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGeofenceIds, setSelectedGeofenceIds] = useState<string[]>([]);
  const [assignAll, setAssignAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = employee.status === "pending";
  const employeeGeofences = employee.geofences || [];

  useEffect(() => {
    if (assignDialogOpen) {
      setSelectedGeofenceIds(employeeGeofences.map((g) => g.id));
      setAssignAll(false);
    }
  }, [assignDialogOpen, employeeGeofences]);

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
      setSelectedGeofenceIds(selectedGeofenceIds.filter((id) => id !== geofenceId));
    }
  };

  const handleRemoveClick = async (
    e: React.MouseEvent,
    geofenceId: string,
  ) => {
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

  const buttonContent =
    employeeGeofences.length > 0 ? (
      <>
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span>
          {employeeGeofences.length} ubicación
          {employeeGeofences.length !== 1 ? "es" : ""}
        </span>
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

            {employeeGeofences.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">
                  Ubicaciones actuales:
                </Label>
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
                  Asignar todas las ubicaciones
                </label>
              </div>

              {!assignAll && (
                <div className="space-y-2">
                  <Label>Selecciona ubicaciones</Label>
                  <div className="max-h-64 overflow-y-auto rounded-md border p-3 space-y-2">
                    {geofences.map((geofence) => (
                      <label
                        key={geofence.id}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <Checkbox
                          checked={selectedGeofenceIds.includes(geofence.id)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(geofence.id, Boolean(checked))
                          }
                        />
                        <span>{geofence.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Asignando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
