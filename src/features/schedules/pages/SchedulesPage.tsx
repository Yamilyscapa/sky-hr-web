import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DataTableCard } from "@/components/ui/data-table-card";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CheckCircle, Trash2 } from "lucide-react";
import { useOrganizationStore } from "@/store/organization-store";
import { type ActionMenuItem } from "@/components/ui/action-menu";
import type { Shift } from "../types";
import { DAYS_OF_WEEK, PRESET_COLORS } from "../types";
import { createShiftColumns } from "../components/ShiftColumns";
import { ShiftDetailsDialog } from "../components/ShiftDetailsDialog";
import { createShift, fetchShifts, updateShift } from "../data";

export function SchedulesPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewShift, setViewShift] = useState<Shift | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { organization } = useOrganizationStore();

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ]);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const isEditing = Boolean(editingShiftId);

  const resetForm = () => {
    setName("");
    setStartTime("09:00");
    setEndTime("17:00");
    setBreakMinutes(60);
    setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
    setSelectedColor(PRESET_COLORS[0]);
    setEditingShiftId(null);
  };

  const handleViewShift = (shift: Shift) => {
    setViewShift(shift);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setName(shift.name);
    setStartTime(shift.start_time.slice(0, 5));
    setEndTime(shift.end_time.slice(0, 5));
    setBreakMinutes(shift.break_minutes);
    setSelectedDays(shift.days_of_week);
    setSelectedColor(shift.color || PRESET_COLORS[0]);
  };

  const handleToggleShiftStatus = async (shift: Shift) => {
    const nextState = !shift.active;
    const actionText = nextState ? "activar" : "desactivar";

    if (!window.confirm(`¿Deseas ${actionText} el turno "${shift.name}"?`)) {
      return;
    }

    setDeletingShiftId(shift.id);
    try {
      const response = await updateShift(shift.id, { active: nextState });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert(`Turno ${nextState ? "activado" : "desactivado"} exitosamente`);
      await loadShifts();
    } catch (error) {
      console.error("Error updating shift status:", error);
      alert("No se pudo actualizar el turno. Por favor, intenta de nuevo.");
    } finally {
      setDeletingShiftId(null);
    }
  };

  const columns = useMemo(
    () =>
      createShiftColumns({
        onView: handleViewShift,
        onEdit: handleEditShift,
        onToggleStatus: handleToggleShiftStatus,
        deletingShiftId,
      }),
    [deletingShiftId],
  );

  const table = useReactTable({
    data: shifts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  const getSelectedShifts = () =>
    table.getSelectedRowModel().rows.map((row) => row.original);

  const handleBulkUpdateShifts = async (active: boolean) => {
    const selected = getSelectedShifts();
    if (selected.length === 0) {
      alert("Selecciona al menos un turno.");
      return;
    }

    const targets = selected.filter((shift) => shift.active !== active);
    if (targets.length === 0) {
      alert(
        active
          ? "Los turnos seleccionados ya están activos."
          : "Los turnos seleccionados ya están inactivos.",
      );
      return;
    }

    if (
      !window.confirm(
        `¿Deseas ${active ? "activar" : "desactivar"} ${targets.length} turno(s)?`,
      )
    ) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      await Promise.all(
        targets.map((shift) => updateShift(shift.id, { active })),
      );
      alert(
        active
          ? "Turnos activados exitosamente"
          : "Turnos desactivados exitosamente",
      );
      await loadShifts();
      table.resetRowSelection();
    } catch (error) {
      console.error("Error updating shifts:", error);
      alert("Ocurrió un error al actualizar los turnos.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const shiftBulkActions: ActionMenuItem[] = [
    {
      label: "Desactivar seleccionados",
      icon: Trash2,
      action: () => handleBulkUpdateShifts(false),
      destructive: true,
      disabled: isBulkProcessing,
    },
    {
      label: "Activar seleccionados",
      icon: CheckCircle,
      action: () => handleBulkUpdateShifts(true),
      disabled: isBulkProcessing,
    },
  ];

  const loadShifts = async () => {
    if (!organization?.id) {
      return;
    }

    try {
      const shiftsList = await fetchShifts();
      setShifts(shiftsList);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      void loadShifts();
    }
  }, [organization?.id]);

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("El nombre del turno es requerido");
      return;
    }

    if (selectedDays.length === 0) {
      alert("Debe seleccionar al menos un día de la semana");
      return;
    }

    if (!organization?.id) {
      alert("No se encontró la organización");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        break_minutes: breakMinutes,
        days_of_week: selectedDays,
        color: selectedColor,
      };

      if (isEditing && editingShiftId) {
        const response = await updateShift(editingShiftId, payload);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert("Turno actualizado exitosamente");
      } else {
        const response = await createShift(payload);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert("Turno creado exitosamente");
      }

      resetForm();
      await loadShifts();
    } catch (error) {
      console.error(
        isEditing ? "Error updating shift:" : "Error creating shift:",
        error,
      );
      alert(
        isEditing
          ? "Error al actualizar el turno. Por favor, intenta de nuevo."
          : "Error al crear el turno. Por favor, intenta de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar turno" : "Crear turno"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <Label htmlFor="shift-name">Nombre del turno</Label>
              <Input
                id="shift-name"
                type="text"
                placeholder="Ejemplo: Turno Mañana"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label htmlFor="start-time">Hora de inicio</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </Field>

              <Field>
                <Label htmlFor="end-time">Hora de fin</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="break-minutes">Descanso (minutos)</Label>
              <Input
                id="break-minutes"
                type="number"
                min={0}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
              />
            </Field>

            <Field>
              <Label>Días de la semana</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      selectedDays.includes(day.value)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field>
              <Label>Color del turno</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-md transition-all ${
                      selectedColor === color
                        ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditing
                    ? "Actualizando..."
                    : "Creando..."
                  : isEditing
                    ? "Guardar cambios"
                    : "Crear turno"}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={resetForm}
                >
                  Cancelar edición
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <DataTableCard
        title="Turnos"
        table={table}
        selectedCount={table.getSelectedRowModel().rows.length}
        bulkActionLabel="Acciones masivas"
        bulkActions={shiftBulkActions}
      />

      {viewShift && (
        <ShiftDetailsDialog
          shift={viewShift}
          open={Boolean(viewShift)}
          onOpenChange={(open) => {
            if (!open) {
              setViewShift(null);
            }
          }}
        />
      )}
    </div>
  );
}
