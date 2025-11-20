import type { PermissionStatus, ApiPermission } from "@/api";

export type Permission = {
  id: string;
  userId: string;
  organizationId: string;
  message: string;
  documentsUrl: string[];
  startingDate: string;
  endDate: string;
  status: PermissionStatus;
  approvedBy: string | null;
  supervisorComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export const PERMISSIONS_QUERY_KEY = ["permissions"] as const;
export const PERMISSIONS_FETCH_PAGE_SIZE = 100;

export const STATUS_FILTER_OPTIONS: Array<{
  label: string;
  value: PermissionStatus | "all";
}> = [
  { label: "Todos los estados", value: "all" },
  { label: "Pendiente", value: "pending" },
  { label: "Aprobado", value: "approved" },
  { label: "Rechazado", value: "rejected" },
];

export function fromApiPermission(p: ApiPermission): Permission {
  return {
    id: p.id,
    userId: p.userId,
    organizationId: p.organizationId,
    message: p.message,
    documentsUrl: p.documentsUrl,
    startingDate: p.startingDate,
    endDate: p.endDate,
    status: p.status,
    approvedBy: p.approvedBy,
    supervisorComment: p.supervisorComment,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
