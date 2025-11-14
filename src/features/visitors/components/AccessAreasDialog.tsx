import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Visitor } from "../types";

type AccessAreasDialogProps = {
  visitor: Visitor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AccessAreasDialog({
  visitor,
  open,
  onOpenChange,
}: AccessAreasDialogProps) {
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
          <DialogTitle>Lugares de acceso</DialogTitle>
          <DialogDescription>
            Lugares de acceso para {visitor.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {accessAreas.length > 0 ? (
            <ul className="list-disc list-inside space-y-2">
              {accessAreas.map((area, index) => (
                <li key={index} className="font-medium capitalize text-sm">
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin lugares de acceso especificados
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
