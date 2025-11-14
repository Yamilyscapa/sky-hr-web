import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Employee, Geofence, Shift } from "../types";
import { ShiftCell } from "./ShiftCell";
import { LocationCell } from "./LocationCell";

type ManageEmployeeDialogProps = {
  employee: Employee;
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageEmployeeDialog({
  employee,
  shifts,
  geofences,
  onAssignShift,
  onAssignLocations,
  onRemoveLocation,
  open,
  onOpenChange,
}: ManageEmployeeDialogProps) {
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
            <ShiftCell
              employee={employee}
              shifts={shifts}
              onAssignShift={onAssignShift}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Ubicaciones
            </p>
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
