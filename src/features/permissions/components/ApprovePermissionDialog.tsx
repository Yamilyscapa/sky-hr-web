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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Permission } from "../types";
import { approvePermissionSchema, ApproveFormValues } from "../schema";

type ApprovePermissionDialogProps = {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (comment?: string) => Promise<void>;
  isSubmitting: boolean;
};

export function ApprovePermissionDialog({
  permission,
  open,
  onOpenChange,
  onApprove,
  isSubmitting,
}: ApprovePermissionDialogProps) {
  const form = useForm<ApproveFormValues>({
    resolver: zodResolver(approvePermissionSchema),
    defaultValues: { comment: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ comment: permission?.supervisorComment ?? "" });
    }
  }, [open, permission, form]);

  const handleSubmit = async (values: ApproveFormValues) => {
    await onApprove(values.comment);
  };

  if (!permission) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Aprobar permiso</DialogTitle>
          <DialogDescription>
            Confirmar aprobación para la solicitud de {permission.message}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor="approve-comment">Comentario</FieldLabel>
            <FieldContent>
              <Textarea
                id="approve-comment"
                placeholder="Comentario opcional para el empleado..."
                rows={3}
                {...form.register("comment")}
              />
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Aprobando..." : "Aprobar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
