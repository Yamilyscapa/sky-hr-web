import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AnnouncementPayload } from "@/api";
import {
  ANNOUNCEMENTS_QUERY_KEY,
  type Announcement,
} from "../../announcements/types";
import {
  createAnnouncementRequest,
  deleteAnnouncementRequest,
  fetchAnnouncementById,
  fetchAnnouncementsFromApi,
  updateAnnouncementRequest,
  isUnauthorizedError,
} from "../../announcements/data";

export function useAnnouncements(options?: {
  includeExpired?: boolean;
  includeFuture?: boolean;
  enabled?: boolean;
}) {
  const includeExpired = options?.includeExpired ?? false;
  const includeFuture = options?.includeFuture ?? false;
  return useQuery({
    queryKey: [
      ...ANNOUNCEMENTS_QUERY_KEY,
      includeExpired,
      includeFuture,
    ],
    queryFn: () =>
      fetchAnnouncementsFromApi({
        includeExpired,
        includeFuture,
      }),
    enabled: options?.enabled ?? true,
  });
}

export function useAnnouncement(id: string | null) {
  return useQuery({
    queryKey: ["announcement", id],
    queryFn: () => fetchAnnouncementById(id as string),
    enabled: !!id,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) =>
      createAnnouncementRequest(payload),
    onSuccess: async () => {
      toast.success("Anuncio creado");
      await queryClient.invalidateQueries({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      if (isUnauthorizedError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo crear el anuncio",
      );
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: AnnouncementPayload }) =>
      updateAnnouncementRequest(input.id, input.payload),
    onSuccess: async () => {
      toast.success("Anuncio actualizado");
      await queryClient.invalidateQueries({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      if (isUnauthorizedError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el anuncio",
      );
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncementRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
        exact: false,
      });

      const snapshots = queryClient.getQueriesData<Announcement[]>({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
      });

      snapshots.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(
          key,
          data.filter((announcement) => announcement.id !== id),
        );
      });

      return { snapshots };
    },
    onSuccess: () => {
      toast.success("Anuncio eliminado");
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (isUnauthorizedError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el anuncio",
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
        exact: false,
      });
    },
  });
}
