import { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import API from "@/api";
import { getOrgId } from "../utils";

type CreateVisitorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
};

export function CreateVisitorDialog({
  open,
  onOpenChange,
  onComplete,
}: CreateVisitorDialogProps) {
  const [accessAreas, setAccessAreas] = useState<string[]>([]);
  const [accessAreaInput, setAccessAreaInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAccessArea = (area: string) => {
    const trimmedArea = area.trim().toLowerCase();
    if (trimmedArea && !accessAreas.includes(trimmedArea)) {
      setAccessAreas([...accessAreas, trimmedArea]);
      setAccessAreaInput("");
    }
  };

  const handleRemoveAccessArea = (areaToRemove: string) => {
    setAccessAreas(accessAreas.filter((area) => area !== areaToRemove));
  };

  const handleAccessAreaInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddAccessArea(accessAreaInput);
    } else if (e.key === "," && accessAreaInput.trim()) {
      e.preventDefault();
      handleAddAccessArea(accessAreaInput);
    } else if (
      e.key === "Backspace" &&
      !accessAreaInput &&
      accessAreas.length > 0
    ) {
      setAccessAreas(accessAreas.slice(0, -1));
    }
  };

  const handleAccessAreaInputBlur = () => {
    if (accessAreaInput.trim()) {
      handleAddAccessArea(accessAreaInput);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = e.currentTarget as HTMLFormElement | null;
    if (!form) {
      toast.error("No se pudo leer el formulario");
      setIsSubmitting(false);
      return;
    }

    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const entryDateStr = String(fd.get("entryDate") || "");
    const exitDateStr = String(fd.get("exitDate") || "");

    if (!name || accessAreas.length === 0 || !entryDateStr || !exitDateStr) {
      toast.error("Completa todos los campos");
      setIsSubmitting(false);
      return;
    }

    const entryDate = new Date(entryDateStr);
    const exitDate = new Date(exitDateStr);
    if (entryDate > exitDate) {
      toast.error("La entrada debe ser antes o igual a la salida");
      setIsSubmitting(false);
      return;
    }

    const orgId = getOrgId();

    try {
      await API.createVisitor(
        {
          name,
          accessAreas,
          entryDate: entryDate.toISOString(),
          exitDate: exitDate.toISOString(),
          approveNow: false,
        },
        orgId,
      );

      toast.success("Visitante creado");
      setAccessAreas([]);
      setAccessAreaInput("");
      form.reset();
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al crear el visitante");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo visitante</DialogTitle>
          <DialogDescription>
            Introduce nombre, accesos y fechas. Todos los campos son
            obligatorios.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor="visitor-name">Nombre</Label>
            <Input
              id="visitor-name"
              name="name"
              placeholder="Nombre completo del visitante"
              required
            />
          </Field>
          <Field>
            <Label htmlFor="visitor-access">Lugares de acceso *</Label>

            {accessAreas.length > 0 && (
              <div className="border rounded-md p-3 bg-gray-50/50 max-h-[150px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {accessAreas.map((area, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                    >
                      <span>{area}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccessArea(area)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Input
              id="visitor-access"
              type="text"
              placeholder={
                accessAreas.length === 0
                  ? "Escribe un lugar de acceso y presiona Enter o coma"
                  : "Agregar más lugares de acceso..."
              }
              value={accessAreaInput}
              onChange={(e) => setAccessAreaInput(e.target.value)}
              onKeyDown={handleAccessAreaInputKeyDown}
              onBlur={handleAccessAreaInputBlur}
              className="h-10"
            />

            <p className="text-xs text-muted-foreground mt-1">
              Presiona Enter o coma para agregar cada lugar. Click en la X para
              remover.
            </p>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="visitor-entry">Fecha y hora de entrada</Label>
              <Input id="visitor-entry" name="entryDate" type="datetime-local" required />
            </Field>
            <Field>
              <Label htmlFor="visitor-exit">Fecha y hora de salida</Label>
              <Input id="visitor-exit" name="exitDate" type="datetime-local" required />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear visitante"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
