import API, {
  type ApiVisitor,
  type PaginatedListResponse,
  extractListData,
} from "@/api";
import type { VisitorsQueryData, VisitorsQueryParams } from "./types";
import { normalizeVisitorRecord, resolvePagination } from "./utils";

export const VISITORS_QUERY_KEY = ["visitors"] as const;
export const DEFAULT_PAGE_SIZE = 20;

export async function fetchVisitors(
  params: VisitorsQueryParams,
): Promise<VisitorsQueryData> {
  const response = await API.getVisitors({
    status: params.status,
    q: params.searchTerm,
    page: params.page,
    pageSize: params.pageSize,
    organizationId: params.organizationId,
  });

  const visitors = extractListData<ApiVisitor>(response).map((record) =>
    normalizeVisitorRecord(record),
  );

  const pagination = resolvePagination(
    response as PaginatedListResponse,
    params.page,
    params.pageSize,
    visitors.length,
  );

  return { visitors, pagination };
}
