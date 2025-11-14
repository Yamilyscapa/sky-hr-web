import api, { extractListData, type PaginationMeta } from "@/api";
import { authClient } from "@/lib/auth-client";
import type {
  AttendanceEvent,
  AttendanceEventsResponse,
  AttendanceStatus,
  UserInfo,
} from "./types";

export const ATTENDANCE_PAGE_SIZE = 20;

export async function fetchAttendanceEvents(params: {
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
}): Promise<AttendanceEventsResponse> {
  const response = await api.getAttendanceEvents({
    page: params.page,
    pageSize: params.pageSize,
    start_date: params.startDate,
    end_date: params.endDate,
  });

  const events = extractListData<AttendanceEvent>(response);
  const pagination = (response?.pagination as PaginationMeta | null) ?? null;

  return { events, pagination };
}

export async function fetchAttendanceReport() {
  const result = await api.getAttendanceReport();
  const flaggedEvents = Array.isArray(result?.data?.flagged_events)
    ? (result.data.flagged_events as AttendanceEvent[])
    : [];

  return flaggedEvents;
}

export async function fetchUserAttendanceHistory(params: {
  userId: string;
  startDate: string;
  endDate: string;
  pageSize?: number;
}) {
  const response = await api.getAttendanceEvents({
    user_id: params.userId,
    start_date: params.startDate,
    end_date: params.endDate,
    page: 1,
    pageSize: params.pageSize ?? 200,
  });

  return extractListData<AttendanceEvent>(response);
}

export async function markAbsences(payload: {
  user_ids: string[];
  date: string;
  notes?: string;
}) {
  return api.markAbsences(payload);
}

export async function updateAttendanceStatus(
  eventId: string,
  data: { status: AttendanceStatus; notes?: string },
) {
  return api.updateAttendanceStatus(eventId, data);
}

export async function fetchOrganizationMembersMap() {
  const membersResult = await authClient.organization.listMembers();
  const members = membersResult.data?.members || [];

  const userMap = new Map<string, UserInfo>();
  members.forEach((member: any) => {
    if (member.user?.id) {
      userMap.set(member.user.id, {
        id: member.user.id,
        name: member.user.name || member.user.email || "Unknown",
        email: member.user.email || "",
      });
    }
  });

  return userMap;
}
