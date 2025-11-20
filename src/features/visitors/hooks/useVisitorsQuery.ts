import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchVisitors, VISITORS_QUERY_KEY } from "../data";
import type { VisitorsQueryData, VisitorsQueryParams } from "../types";

export function useVisitorsQuery(params: VisitorsQueryParams) {
  const query = useQuery<VisitorsQueryData, Error>({
    queryKey: [
      ...VISITORS_QUERY_KEY,
      params.status,
      params.searchTerm ?? "",
      params.page,
      params.pageSize,
      params.organizationId,
    ],
    queryFn: () => fetchVisitors(params),
  });

  useEffect(() => {
    if (query.isError) {
      const error = query.error;
      toast.error(
        error instanceof Error ? error.message : "No se pudo cargar la lista",
      );
    }
  }, [query.isError, query.error]);

  return query;
}
