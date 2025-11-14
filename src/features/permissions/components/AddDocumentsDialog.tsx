import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";
import { toast } from "sonner";
import type { Permission } from "../types";

type AddDocumentsDialogProps = {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDocuments: (files: File[]) => Promise<void>;
  isSubmitting: boolean;
};

export function AddDocumentsDialog({
  permission,
  open,
  onOpenChange,
  onAddDocuments,
  isSubmitting,
}: AddDocumentsDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    if (open) {
      setSelectedFiles([]);
      setFileInputKey((prev) => prev + 1);
    }
  }, [open]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
      const maxSize = 10 * 1024 * 1024;

      if (!validTypes.includes(file.type)) {
        toast.error(
          `${file.name}: Tipo de archivo no válido. Solo se permiten PDF, JPEG y PNG.`,
        );
        return false;
      }

      if (file.size > maxSize) {
        toast.error(
          `${file.name}: El archivo es demasiado grande. Máximo 10MB.`,
        );
        return false;
      }

      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error("Selecciona al menos un archivo");
      return;
    }

    await onAddDocuments(selectedFiles);
  };

  if (!permission) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Agregar documentos</DialogTitle>
          <DialogDescription>
            Sube documentos adicionales para esta solicitud de permiso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="documents">Documentos</FieldLabel>
            <FieldContent>
              <Input
                id="documents"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                key={fileInputKey}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos permitidos: PDF, JPEG, PNG. Máximo 10MB por archivo.
              </p>
            </FieldContent>
          </Field>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Archivos seleccionados:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedFiles.length === 0}>
              {isSubmitting ? "Subiendo..." : "Agregar documentos"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
