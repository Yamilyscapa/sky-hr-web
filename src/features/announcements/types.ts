import type {
  AnnouncementPriority as ApiAnnouncementPriority,
  ApiAnnouncement,
} from "@/api";

export type AnnouncementPriority = ApiAnnouncementPriority;

export type AnnouncementStatus = "active" | "future" | "expired";

export type Announcement = {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  published_at: string;
  expires_at: string | null;
  created_at: string;
};

export type AnnouncementWithStatus = Announcement & {
  status: AnnouncementStatus;
};

export const PRIORITY_FILTER_OPTIONS: Array<{
  label: string;
  value: AnnouncementPriority | "all";
}> = [
  { label: "Todas las prioridades", value: "all" },
  { label: "Normal", value: "normal" },
  { label: "Importante", value: "important" },
  { label: "Urgente", value: "urgent" },
];

export const STATUS_FILTER_OPTIONS: Array<{
  label: string;
  value: AnnouncementStatus | "all";
}> = [
  { label: "Todos los estados", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Futuros", value: "future" },
  { label: "Expirados", value: "expired" },
];

export const ANNOUNCEMENTS_QUERY_KEY = ["announcements"] as const;
export const ANNOUNCEMENTS_FETCH_PAGE_SIZE = 100;

export function fromApiAnnouncement(a: ApiAnnouncement): Announcement {
  return {
    id: a.id,
    organization_id: a.organizationId ?? "",
    title: a.title,
    content: a.content,
    priority: a.priority,
    published_at: a.publishedAt,
    expires_at: a.expiresAt,
    created_at: a.createdAt,
  };
}

export function computeAnnouncementStatus(
  publishedISO: string,
  expiresISO: string | null,
): AnnouncementStatus {
  const now = new Date();
  const published = new Date(publishedISO);
  const expires = expiresISO ? new Date(expiresISO) : null;

  if (published > now) {
    return "future";
  }

  if (expires && expires < now) {
    return "expired";
  }

  return "active";
}
