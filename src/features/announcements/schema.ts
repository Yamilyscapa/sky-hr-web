import { z } from "zod";

export const announcementsFormSchema = z
  .object({
    title: z.string().min(1, "El título es requerido"),
    content: z.string().min(1, "El contenido es requerido"),
    priority: z.enum(["normal", "important", "urgent"]),
    published_at: z.date({
      required_error: "La fecha de publicación es obligatoria",
      invalid_type_error: "La fecha de publicación es inválida",
    }),
    expires_at: z
      .date({
        invalid_type_error: "La fecha de expiración es inválida",
      })
      .nullable()
      .optional(),
  })
  .refine(
    (values) => {
      if (!values.expires_at) return true;
      if (!values.published_at) return false;
      return values.expires_at > values.published_at;
    },
    {
      path: ["expires_at"],
      message: "La fecha de expiración debe ser posterior a la publicación",
    },
  );

export type AnnouncementFormValues = z.infer<typeof announcementsFormSchema>;
