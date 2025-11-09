import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useOrganizationStore } from "@/store/organization-store";
import { Separator } from "@/components/ui/separator";
import { DataTableCard } from "@/components/ui/data-table-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { useReactTable } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Clock,
} from "lucide-react";
import API from "@/api";

export const Route = createFileRoute("/(company)/schedules")({
  component: RouteComponent,
});

type Shift = {
  id: string;
  organization_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  days_of_week: string[];
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const DAYS_OF_WEEK = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Green
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
];

// Actions cell component
function ActionsCell({ shift }: { shift: Shift }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-md">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <Eye className="h-4 w-4" />
          <span>Ver detalles</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <Edit className="h-4 w-4" />
          <span>Editar</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4" />
          <span>Eliminar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columns: ColumnDef<Shift>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    header: ({ column }) => {
      return (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Nombre</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      );
    },
    accessorKey: "name",
    cell: ({ row }) => {
      const name = row.original.name;
      const color = row.original.color;
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{name}</span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    header: "Horario",
    accessorKey: "start_time",
    cell: ({ row }) => {
      const startTime = row.original.start_time;
      const endTime = row.original.end_time;
      return (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-gray-400" />
          <span>
            {startTime} - {endTime}
          </span>
        </div>
      );
    },
  },
  {
    header: "Descanso",
    accessorKey: "break_minutes",
    cell: ({ row }) => {
      const breakMinutes = row.original.break_minutes;
      return <span>{breakMinutes} min</span>;
    },
  },
  {
    header: "Días",
    accessorKey: "days_of_week",
    cell: ({ row }) => {
      const days = row.original.days_of_week;
      const dayLabels = days
        .map(
          (day) =>
            DAYS_OF_WEEK.find((d) => d.value === day)?.label.substring(0, 3) ||
            day
        )
        .join(", ");
      return <span className="text-sm">{dayLabels}</span>;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return <ActionsCell shift={row.original} />;
    },
    enableSorting: false,
    enableHiding: false,
  },
];

function RouteComponent() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { organization } = useOrganizationStore();

  // Form state
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

  const table = useReactTable({
    data: shifts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  async function fetchShifts() {
    if (!organization?.id) {
      return;
    }

    try {
      const response = await API.getShifts();

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let shiftsList: Shift[] = [];

      if (Array.isArray(data)) {
        shiftsList = data;
      } else if (data.data && Array.isArray(data.data)) {
        shiftsList = data.data;
      }

      setShifts(shiftsList);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  }

  useEffect(() => {
    if (organization?.id) {
      fetchShifts();
    }
  }, [organization?.id]);

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
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
      const response = await API.createShift({
        name: name.trim(),
        start_time: startTime + ":00",
        end_time: endTime + ":00",
        break_minutes: breakMinutes,
        days_of_week: selectedDays,
        color: selectedColor,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      alert("Turno creado exitosamente");

      // Reset form
      setName("");
      setStartTime("09:00");
      setEndTime("17:00");
      setBreakMinutes(60);
      setSelectedDays(["monday", "tuesday", "wednesday", "thursday", "friday"]);
      setSelectedColor(PRESET_COLORS[0]);

      // Refresh shifts list
      await fetchShifts();
    } catch (error) {
      console.error("Error creating shift:", error);
      alert("Error al crear el turno. Por favor, intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleBulkAction() {
    const selectedRows = table.getSelectedRowModel().rows;
    console.log(
      "Bulk action on selected rows:",
      selectedRows.map((row) => row.original)
    );
  }

  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>Crear turno</CardTitle>
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
              <Label htmlFor="break-minutes">Tiempo de descanso (minutos)</Label>
              <Input
                id="break-minutes"
                type="number"
                min="0"
                max="480"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
              />
            </Field>

            <Field>
              <Label>Días de la semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedDays.includes(day.value)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {day.label}
                  </button>
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

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear turno"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <DataTableCard
        title="Turnos"
        table={table}
        selectedCount={table.getSelectedRowModel().rows.length}
        bulkActionLabel="Acciones masivas"
        onBulkAction={handleBulkAction}
      />
    </div>
  );
}

