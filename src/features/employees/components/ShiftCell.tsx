import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
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
import type { Employee, Shift } from "../types";

type ShiftCellProps = {
  employee: Employee;
  shifts: Shift[];
  onAssignShift: (
    employeeId: string,
    shiftId: string,
    effectiveFrom: string,
    effectiveUntil?: string,
  ) => Promise<void>;
};

export function ShiftCell({
  employee,
  shifts,
  onAssignShift,
}: ShiftCellProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = employee.status === "pending";
  const shift = employee.shift;

  useEffect(() => {
    if (assignDialogOpen) {
      const today = new Date().toISOString().split("T")[0];
      setEffectiveFrom(today);
      setSelectedShiftId("");
      setEffectiveUntil("");
    }
  }, [assignDialogOpen]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftId || !effectiveFrom) {
      alert("Por favor selecciona un turno y una fecha de inicio");
      return;
    }

    if (!employee.id) {
      alert("ID de empleado no encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssignShift(
        employee.id,
        selectedShiftId,
        effectiveFrom,
        effectiveUntil || undefined,
      );
      setAssignDialogOpen(false);
    } catch (error) {
      console.error("Error assigning shift:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonContent = shift ? (
    <>
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: shift.color }}
      />
      <span className="truncate">{shift.name}</span>
    </>
  ) : (
    <>
      <Clock className="h-3 w-3 flex-shrink-0" />
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
                {shift ? "Cambiar turno de" : "Asignar turno a"}{" "}
                {employee.name || employee.email}
              </DialogTitle>
              <DialogDescription>
                Selecciona un turno y el periodo de asignación.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignSubmit} className="flex flex-col gap-4">
              <Field>
                <Label htmlFor="shift-select">Turno</Label>
                <select
                  id="shift-select"
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Seleccionar turno...</option>
                  {shifts.map((shiftOption) => (
                    <option key={shiftOption.id} value={shiftOption.id}>
                      {shiftOption.name} ({shiftOption.start_time} -{" "}
                      {shiftOption.end_time})
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <Label htmlFor="effective-from">Fecha de inicio</Label>
                <Input
                  id="effective-from"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <Label htmlFor="effective-until">Fecha de fin (opcional)</Label>
                <Input
                  id="effective-until"
                  type="date"
                  value={effectiveUntil}
                  onChange={(e) => setEffectiveUntil(e.target.value)}
                  min={effectiveFrom}
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
                    : shift
                      ? "Cambiar turno"
                      : "Asignar turno"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
