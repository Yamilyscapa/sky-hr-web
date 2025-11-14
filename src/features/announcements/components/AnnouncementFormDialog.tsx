import { useEffect } from "react";
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
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Announcement } from "../types";
import {
  AnnouncementFormValues,
  announcementsFormSchema,
} from "../schema";
import { toDateTimeLocal } from "../utils";
import { Textarea } from "@/components/ui/textarea";
import { SelectBase } from "@/components/ui/select-base";

type AnnouncementFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Announcement | null;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
  isSubmitting: boolean;
};

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: AnnouncementFormDialogProps) {
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementsFormSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "normal",
      published_at: new Date(),
      expires_at: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: initialData?.title ?? "",
        content: initialData?.content ?? "",
        priority: initialData?.priority ?? "normal",
        published_at: initialData
          ? new Date(initialData.published_at)
          : new Date(),
        expires_at: initialData?.expires_at
          ? new Date(initialData.expires_at)
          : null,
      });
    }
  }, [initialData, open, form]);

  const handleSubmit = async (values: AnnouncementFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar anuncio" : "Nuevo anuncio"}
          </DialogTitle>
          <DialogDescription>
            Completa la información para {initialData ? "actualizar" : "crear"}{" "}
            el anuncio.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor="announcement-title">Título</FieldLabel>
            <FieldContent>
              <Input
                id="announcement-title"
                placeholder="Ej. Mantenimiento programado"
                aria-invalid={!!form.formState.errors.title}
                {...form.register("title")}
              />
              <FieldError errors={[form.formState.errors.title]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="announcement-content">
              Contenido
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="announcement-content"
                placeholder="Describe los detalles importantes..."
                rows={4}
                aria-invalid={!!form.formState.errors.content}
                {...form.register("content")}
              />
              <FieldError errors={[form.formState.errors.content]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="announcement-priority-select">
              Prioridad
            </FieldLabel>
            <FieldContent>
              <SelectBase
                id="announcement-priority-select"
                aria-invalid={!!form.formState.errors.priority}
                {...form.register("priority")}
              >
                <option value="normal">Normal</option>
                <option value="important">Importante</option>
                <option value="urgent">Urgente</option>
              </SelectBase>
              <FieldError errors={[form.formState.errors.priority]} />
            </FieldContent>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Fecha de publicación</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="published_at"
                  render={({ field }) => (
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocal(field.value)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            ? new Date(event.target.value)
                            : new Date(),
                        )
                      }
                    />
                  )}
                />
                <FieldError errors={[form.formState.errors.published_at]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Fecha de expiración</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="expires_at"
                  render={({ field }) => (
                    <Input
                      type="datetime-local"
                      value={field.value ? toDateTimeLocal(field.value) : ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            ? new Date(event.target.value)
                            : null,
                        )
                      }
                    />
                  )}
                />
                <FieldError errors={[form.formState.errors.expires_at]} />
              </FieldContent>
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
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
