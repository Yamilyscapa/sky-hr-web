import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Employee } from "../types";
import { useQueryClient } from "@tanstack/react-query";
import {
  employeeHourlyRateQueryKey,
  useEmployeeHourlyRate,
} from "../hooks/useEmployees";

type HourlyRateCellProps = {
  employee: Employee;
  onAssignHourlyRate: (
    employeeId: string,
    hourlyRate: number,
    effectiveFrom: string,
    effectiveUntil?: string,
  ) => Promise<void>;
};

export function HourlyRateCell({
  employee,
  onAssignHourlyRate,
}: HourlyRateCellProps) {
  const queryClient = useQueryClient();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [hourlyRate, setHourlyRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = employee.status === "pending";
  const {
    data: fetchedRate,
    isLoading: isLoadingRate,
    isFetching: isFetchingRate,
  } = useEmployeeHourlyRate(employee.id, !isPending);
  const currentRate = typeof fetchedRate === "number" ? fetchedRate : null;

  useEffect(() => {
    if (assignDialogOpen) {
      const today = new Date().toISOString().split("T")[0];
      setEffectiveFrom(today);
      setHourlyRate(currentRate ? currentRate.toString() : "");
    }
  }, [assignDialogOpen, currentRate]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hourlyRate || !effectiveFrom) {
      alert("Por favor ingresa una tarifa por hora y una fecha de inicio");
      return;
    }

    const rateValue = parseFloat(hourlyRate);
    if (isNaN(rateValue) || rateValue <= 0) {
      alert("Por favor ingresa una tarifa válida mayor a 0");
      return;
    }

    if (!employee.id) {
      alert("ID de empleado no encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssignHourlyRate(
        employee.id,
        rateValue,
        effectiveFrom,
        undefined,
      );
      setAssignDialogOpen(false);
      queryClient.setQueryData(
        employeeHourlyRateQueryKey(employee.id),
        rateValue,
      );
    } catch (error) {
      console.error("Error assigning hourly rate:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonContent = isLoadingRate || isFetchingRate ? (
    <>
      <DollarSign className="h-3 w-3 flex-shrink-0" />
      <span>Cargando...</span>
    </>
  ) : currentRate ? (
    <>
      <DollarSign className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">${currentRate.toFixed(2)}</span>
    </>
  ) : (
    <>
      <DollarSign className="h-3 w-3 flex-shrink-0" />
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
        className="text-gray-700 hover:bg-gray-50 w-32 justify-center gap-1.5 h-8 text-xs"
      >
        {buttonContent}
      </Button>

      {!isPending && (
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {currentRate ? "Cambiar tarifa por hora de" : "Asignar tarifa por hora a"}{" "}
                {employee.name || employee.email}
              </DialogTitle>
              <DialogDescription>
                Esta tarifa se usará para calcular las estadisticas de la empresa.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignSubmit} className="flex flex-col gap-4">
              <Field>
                <Label htmlFor="hourly-rate">Tarifa por hora (MXN)</Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Asignando..."
                    : currentRate
                      ? "Cambiar tarifa"
                      : "Asignar tarifa"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
