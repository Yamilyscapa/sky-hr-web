import { z } from "zod";

export const approvePermissionSchema = z.object({
  comment: z.string().optional(),
});

export const rejectPermissionSchema = z.object({
  comment: z.string().min(1, "El comentario es requerido"),
});

export type ApproveFormValues = z.infer<typeof approvePermissionSchema>;
export type RejectFormValues = z.infer<typeof rejectPermissionSchema>;
