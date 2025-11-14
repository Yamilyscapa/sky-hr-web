import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import API from "@/api";
import { VISITORS_QUERY_KEY } from "../data";
import { getOrgId } from "../utils";

type VisitorAction = (id: string, orgId?: string) => Promise<unknown>;

export function useVisitorActions() {
  const queryClient = useQueryClient();

  const runAction = useCallback(
    async (
      action: VisitorAction,
      id: string,
      successMessage: string,
      errorMessage: string,
    ) => {
      try {
        const orgId = getOrgId();
        await action(id, orgId);
        toast.success(successMessage);
        await queryClient.invalidateQueries({
          queryKey: VISITORS_QUERY_KEY,
          exact: false,
        });
      } catch (error: any) {
        toast.error(error?.message || errorMessage);
      }
    },
    [queryClient],
  );

  return {
    approve: (id: string) =>
      runAction(
        (visitorId, orgId) => API.approveVisitor(visitorId, orgId),
        id,
        "Visitante aprobado",
        "Error al aprobar",
      ),
    reject: (id: string) =>
      runAction(
        (visitorId, orgId) => API.rejectVisitor(visitorId, orgId),
        id,
        "Visitante rechazado",
        "Error al rechazar",
      ),
    cancel: (id: string) =>
      runAction(
        (visitorId, orgId) => API.cancelVisitor(visitorId, orgId),
        id,
        "Visitante cancelado",
        "Error al cancelar",
      ),
  };
}
