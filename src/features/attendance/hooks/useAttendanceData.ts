import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ATTENDANCE_PAGE_SIZE,
  fetchAttendanceEvents,
  fetchAttendanceReport,
  fetchOrganizationMembersMap,
} from "../data";
import type {
  AttendanceEvent,
  AttendanceEventsResponse,
  UserInfo,
} from "../types";

const ATTENDANCE_EVENTS_QUERY_KEY = ["attendance-events"] as const;
const ATTENDANCE_FLAGGED_QUERY_KEY = ["attendance-flagged-events"] as const;
const ATTENDANCE_MEMBERS_MAP_QUERY_KEY = [
  "attendance-organization-members",
] as const;

export const attendanceEventsQueryKey = (
  organizationId?: string,
  startDate?: string,
  endDate?: string,
  page?: number,
  pageSize?: number,
) => [
  ...ATTENDANCE_EVENTS_QUERY_KEY,
  organizationId ?? "unknown",
  startDate ?? "start",
  endDate ?? "end",
  page ?? 1,
  pageSize ?? ATTENDANCE_PAGE_SIZE,
];

export function useAttendanceEventsQuery(options: {
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const { organizationId, startDate, endDate, page, pageSize, enabled = true } =
    options;

  return useQuery<AttendanceEventsResponse>({
    queryKey: attendanceEventsQueryKey(
      organizationId,
      startDate,
      endDate,
      page,
      pageSize,
    ),
    queryFn: async () => {
      if (!organizationId || !startDate || !endDate) {
        return { events: [], pagination: null } satisfies AttendanceEventsResponse;
      }

      return await fetchAttendanceEvents({
        page,
        pageSize: pageSize ?? ATTENDANCE_PAGE_SIZE,
        startDate,
        endDate,
      });
    },
    enabled: Boolean(organizationId && startDate && endDate && enabled),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export const attendanceFlaggedEventsQueryKey = (organizationId?: string) => [
  ...ATTENDANCE_FLAGGED_QUERY_KEY,
  organizationId ?? "unknown",
];

export function useAttendanceFlaggedEventsQuery(organizationId?: string) {
  return useQuery<AttendanceEvent[]>({
    queryKey: attendanceFlaggedEventsQueryKey(organizationId),
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }
      return await fetchAttendanceReport();
    },
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export const attendanceMembersMapQueryKey = (organizationId?: string) => [
  ...ATTENDANCE_MEMBERS_MAP_QUERY_KEY,
  organizationId ?? "unknown",
];

export function useAttendanceMembersMap(organizationId?: string) {
  return useQuery<Map<string, UserInfo>>({
    queryKey: attendanceMembersMapQueryKey(organizationId),
    queryFn: async () => {
      if (!organizationId) {
        return new Map<string, UserInfo>();
      }
      return await fetchOrganizationMembersMap();
    },
    enabled: Boolean(organizationId),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
