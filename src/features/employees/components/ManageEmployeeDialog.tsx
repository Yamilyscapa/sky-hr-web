import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Employee, Geofence, Shift } from "../types";
import { ShiftCell } from "./ShiftCell";
import { HourlyRateCell } from "./HourlyRateCell";
import { Switch } from "@/components/ui/switch";
import {
  employeeOvertimeQueryKey,
  useEmployeeOvertime,
} from "../hooks/useEmployees";

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
  onAssignHourlyRate: (
    employeeId: string,
    hourlyRate: number,
    effectiveFrom: string,
    effectiveUntil?: string,
  ) => Promise<void>;
  onUpdateOvertime: (
    employeeId: string,
    overtimeAllowed: boolean,
  ) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageEmployeeDialog({
  employee,
  shifts,
  onAssignShift,
  onAssignHourlyRate,
  onUpdateOvertime,
  open,
  onOpenChange,
}: ManageEmployeeDialogProps) {
  const queryClient = useQueryClient();
  const [isUpdatingOvertime, setIsUpdatingOvertime] = useState(false);
  const overtimeQueryKey = employee.id
    ? employeeOvertimeQueryKey(employee.id)
    : null;
  const {
    data: overtimeData,
    isLoading: isLoadingOvertime,
    isFetching: isFetchingOvertime,
    isFetched: hasLoadedOvertime,
  } = useEmployeeOvertime(employee.id, open);
  const overtimeAllowed = overtimeData ?? false;
  const isOvertimeReady = hasLoadedOvertime && employee.id;

  const handleOvertimeToggle = async (checked: boolean) => {
    if (!employee.id || !overtimeQueryKey) {
      return;
    }

    const previousValue =
      queryClient.getQueryData<boolean>(overtimeQueryKey) ?? overtimeAllowed;
    setIsUpdatingOvertime(true);
    queryClient.setQueryData(overtimeQueryKey, checked);

    try {
      await onUpdateOvertime(employee.id, checked);
    } catch (error) {
      console.error("Error updating overtime preference:", error);
      queryClient.setQueryData(overtimeQueryKey, previousValue);
    } finally {
      setIsUpdatingOvertime(false);
    }
  };

  const isSwitchDisabled =
    isLoadingOvertime || isUpdatingOvertime || !isOvertimeReady;
  const statusLabel = isUpdatingOvertime
    ? "Guardando..."
    : isLoadingOvertime || (!isOvertimeReady && open) || isFetchingOvertime
      ? "Cargando..."
      : null;

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
            <p className="text-sm font-medium text-muted-foreground">Tasa por hora</p>
            <HourlyRateCell
              employee={employee}
              onAssignHourlyRate={onAssignHourlyRate}
            />
          </div>
          {/* Allow extra hours for overtime (boolean) */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/50">
            <div>
              <p className="text-sm font-medium">Permitir horas extra</p>
              <span className="text-xs text-muted-foreground">
                Activa para que este empleado pueda registrar horas adicionales.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                aria-label="Permitir horas extra"
                checked={overtimeAllowed}
                disabled={isSwitchDisabled}
                onCheckedChange={(checked) => {
                  void handleOvertimeToggle(checked);
                }}
              />
              {statusLabel && (
                <span className="text-xs text-muted-foreground">
                  {statusLabel}
                </span>
              )}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
