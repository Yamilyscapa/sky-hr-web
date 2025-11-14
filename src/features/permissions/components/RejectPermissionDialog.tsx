import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Permission } from "../types";
import { rejectPermissionSchema, RejectFormValues } from "../schema";

type RejectPermissionDialogProps = {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: (comment: string) => Promise<void>;
  isSubmitting: boolean;
};

export function RejectPermissionDialog({
  permission,
  open,
  onOpenChange,
  onReject,
  isSubmitting,
}: RejectPermissionDialogProps) {
  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectPermissionSchema),
    defaultValues: {
      comment: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ comment: "" });
    }
  }, [open, form]);

  const handleSubmit = async (values: RejectFormValues) => {
    await onReject(values.comment);
  };

  if (!permission) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Rechazar permiso</DialogTitle>
          <DialogDescription>
            Indica el motivo del rechazo de esta solicitud.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor="reject-comment">
              Comentario <span className="text-red-600">*</span>
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="reject-comment"
                placeholder="Explica el motivo del rechazo..."
                rows={4}
                aria-invalid={!!form.formState.errors.comment}
                {...form.register("comment")}
              />
              <FieldError errors={[form.formState.errors.comment]} />
            </FieldContent>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Rechazando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
