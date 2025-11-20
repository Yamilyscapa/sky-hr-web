import type { PaginatedListResponse } from "@/api";
import type { PaginationLike, Visitor } from "./types";

export function getOrgId() {
  try {
    const keys = [
      "activeOrganizationId",
      "organizationId",
      "orgId",
      "active_org_id",
    ];
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    if (typeof window !== "undefined") {
      // @ts-expect-error window.__ORG_ID__ may exist during SSR hydration
      return window.__ORG_ID__ as string | undefined;
    }
  } catch {
    // Ignore storage access errors and fall through to undefined
  }
  return undefined;
}

export function normalizeVisitorRecord(raw: any): Visitor {
  return {
    id: raw.id,
    name: raw.name,
    accessAreas: Array.isArray(raw.access_areas)
      ? raw.access_areas
      : Array.isArray(raw.accessAreas)
        ? raw.accessAreas
        : raw.accessAreas
          ? [raw.accessAreas]
          : [],
    entryDate: raw.entry_date ?? raw.entryDate,
    exitDate: raw.exit_date ?? raw.exitDate,
    status: raw.status,
    approvedByUserId: raw.approved_by_user_id ?? raw.approvedByUserId,
    approvedAt: raw.approved_at ?? raw.approvedAt,
    qrUrl: raw.qr_url ?? raw.qrUrl,
  };
}

export function resolvePagination(
  response: PaginatedListResponse,
  fallbackPage: number,
  fallbackPageSize: number,
  fallbackTotal: number,
) {
  const paginationSource = (
    response.pagination ?? (response as { meta?: PaginationLike }).meta
  ) as PaginationLike | undefined;

  if (!paginationSource) {
    return null;
  }

  const pageSizeValue = paginationSource.pageSize ?? fallbackPageSize;
  const total = paginationSource.total ?? fallbackTotal;

  return {
    page: paginationSource.page ?? fallbackPage,
    pageSize: pageSizeValue,
    total,
    totalPages:
      paginationSource.totalPages ??
      (pageSizeValue > 0 ? Math.ceil(total / pageSizeValue) : 0),
  };
}
