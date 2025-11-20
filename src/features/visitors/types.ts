import type { ApiVisitor, PaginationMeta, VisitorStatus } from "@/api";

export type Visitor = ApiVisitor;

export type VisitorsQueryParams = {
  status: VisitorStatus | "all";
  searchTerm?: string;
  page: number;
  pageSize: number;
  organizationId?: string;
};

export type VisitorsQueryData = {
  visitors: Visitor[];
  pagination: PaginationMeta | null;
};

export type PaginationLike = {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};
