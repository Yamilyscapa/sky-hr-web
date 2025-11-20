import API, {
  AnnouncementPayload,
  ApiAnnouncement,
  ApiClientError,
  extractListData,
} from "@/api";
import {
  ANNOUNCEMENTS_FETCH_PAGE_SIZE,
  Announcement,
  fromApiAnnouncement,
} from "./types";

export function isUnauthorizedError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.status === 401 || error.status === 403)
  );
}

export async function fetchAnnouncementsFromApi(params?: {
  includeExpired?: boolean;
  includeFuture?: boolean;
}) {
  const results: Announcement[] = [];
  let currentPage = 1;

  while (true) {
    const response = await API.getAnnouncements({
      includeExpired: params?.includeExpired,
      includeFuture: params?.includeFuture,
      page: currentPage,
      pageSize: ANNOUNCEMENTS_FETCH_PAGE_SIZE,
    });

    const pageAnnouncements = extractListData<ApiAnnouncement>(response).map(
      fromApiAnnouncement,
    );
    results.push(...pageAnnouncements);

    const pagination = response?.pagination;
    const totalPages = pagination?.totalPages;
    const shouldFetchNext =
      (totalPages && currentPage < totalPages) ||
      (!totalPages &&
        pageAnnouncements.length === ANNOUNCEMENTS_FETCH_PAGE_SIZE);

    if (!shouldFetchNext) {
      break;
    }

    currentPage += 1;
  }

  return results;
}

export async function fetchAnnouncementById(id: string) {
  const response = await API.getAnnouncement(id);
  if (!response?.data) {
    throw new Error("No se pudo obtener el anuncio solicitado");
  }
  return fromApiAnnouncement(response.data);
}

export async function createAnnouncementRequest(payload: AnnouncementPayload) {
  const response = await API.createAnnouncement(payload);
  if (!response?.data) {
    throw new Error("No se pudo crear el anuncio");
  }
  return fromApiAnnouncement(response.data);
}

export async function updateAnnouncementRequest(
  id: string,
  payload: AnnouncementPayload,
) {
  const response = await API.updateAnnouncement(id, payload);
  if (!response?.data) {
    throw new Error("No se pudo actualizar el anuncio");
  }
  return fromApiAnnouncement(response.data);
}

export async function deleteAnnouncementRequest(id: string) {
  await API.deleteAnnouncement(id);
  return { id };
}
