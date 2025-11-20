import type { PaginationMeta } from "@/api";

export type AttendanceStatus =
  | "on_time"
  | "late"
  | "early"
  | "absent"
  | "out_of_bounds";

export type AttendanceEvent = {
  id: string;
  user_id: string;
  organization_id: string;
  shift_id: string | null;
  check_in: string;
  check_out: string | null;
  status: AttendanceStatus;
  is_within_geofence: boolean;
  distance_to_geofence_m: number | null;
  is_verified: boolean;
  source: string;
  latitude: string | null;
  longitude: string | null;
  face_confidence: string | null;
  liveness_score?: string | null;
  spoof_flag: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  work_duration_minutes?: number;
};

export type UserInfo = {
  id: string;
  name: string;
  email: string;
};

export type AttendanceFilters = {
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
};

export type AttendanceEventsResponse = {
  events: AttendanceEvent[];
  pagination: PaginationMeta | null;
};
