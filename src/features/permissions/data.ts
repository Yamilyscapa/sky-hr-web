import API, {
  ApiPermission,
  ApiClientError,
  PermissionStatus,
  extractListData,
} from "@/api";
import {
  PERMISSIONS_FETCH_PAGE_SIZE,
  Permission,
  fromApiPermission,
} from "./types";

export function isUnauthorizedPermissionError(
  error: unknown,
): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.status === 401 || error.status === 403)
  );
}

export async function fetchPermissionsFromApi(params?: {
  status?: PermissionStatus;
  userId?: string;
}) {
  const results: Permission[] = [];
  let currentPage = 1;

  while (true) {
    const response = await API.getPermissions({
      status: params?.status,
      userId: params?.userId,
      page: currentPage,
      pageSize: PERMISSIONS_FETCH_PAGE_SIZE,
    });

    const pagePermissions = extractListData<ApiPermission>(response).map(
      fromApiPermission,
    );
    results.push(...pagePermissions);

    const pagination = response?.pagination;
    const totalPages = pagination?.totalPages;
    const shouldFetchNext =
      (totalPages && currentPage < totalPages) ||
      (!totalPages &&
        pagePermissions.length === PERMISSIONS_FETCH_PAGE_SIZE);

    if (!shouldFetchNext) {
      break;
    }

    currentPage += 1;
  }

  return results;
}

export async function fetchPermissionById(id: string) {
  const response = await API.getPermission(id);
  if (!response?.data) {
    throw new Error("No se pudo obtener el permiso solicitado");
  }
  return fromApiPermission(response.data);
}
