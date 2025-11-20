import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PermissionStatus } from "@/api";
import { PERMISSIONS_QUERY_KEY } from "../types";
import {
  fetchPermissionById,
  fetchPermissionsFromApi,
  isUnauthorizedPermissionError,
} from "../data";
import API from "@/api";

export function usePermissions(options?: {
  status?: PermissionStatus;
  userId?: string;
  enabled?: boolean;
}) {
  const status = options?.status;
  const userId = options?.userId;
  return useQuery({
    queryKey: [...PERMISSIONS_QUERY_KEY, status, userId],
    queryFn: () =>
      fetchPermissionsFromApi({
        status,
        userId,
      }),
    enabled: options?.enabled ?? true,
  });
}

export function usePermission(id: string | null) {
  return useQuery({
    queryKey: ["permission", id],
    queryFn: () => fetchPermissionById(id as string),
    enabled: !!id,
  });
}

export function useApprovePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      API.approvePermission(id, comment),
    onSuccess: async () => {
      toast.success("Permiso aprobado");
      await queryClient.invalidateQueries({
        queryKey: PERMISSIONS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      if (isUnauthorizedPermissionError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo aprobar el permiso",
      );
    },
  });
}

export function useRejectPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      API.rejectPermission(id, comment),
    onSuccess: async () => {
      toast.success("Permiso rechazado");
      await queryClient.invalidateQueries({
        queryKey: PERMISSIONS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      if (isUnauthorizedPermissionError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo rechazar el permiso",
      );
    },
  });
}

export function useAddPermissionDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      API.addPermissionDocuments(id, files),
    onSuccess: async () => {
      toast.success("Documentos agregados");
      await queryClient.invalidateQueries({
        queryKey: PERMISSIONS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      if (isUnauthorizedPermissionError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron agregar los documentos",
      );
    },
  });
}
