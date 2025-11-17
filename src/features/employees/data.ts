import API, { extractListData } from "@/api";
import type { Geofence, Shift } from "./types";

export async function fetchShifts() {
  const response = await API.getShifts();
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (Array.isArray(result)) {
    return result as Shift[];
  }

  if (Array.isArray(result?.data)) {
    return result.data as Shift[];
  }

  return [] as Shift[];
}

export async function fetchGeofences(organizationId: string) {
  const response = await API.getGeofencesByOrganization(organizationId);
  return extractListData<Geofence>(response);
}

export async function assignShift(payload: {
  user_id: string;
  shift_id: string;
  effective_from: string;
  effective_until?: string;
}) {
  return API.assignShift(payload);
}

export async function assignHourlyRate(userId: string, hourlyRate: number) {
  return API.updateHourlyRate(userId, hourlyRate);
}

export async function fetchHourlyRate(userId: string) {
  const response = await API.getHourlyRate(userId);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  const hourlyRate = result?.data?.hourlyRate ?? result?.data?.hourly_rate;
  return typeof hourlyRate === "number" ? hourlyRate : null;
}

export async function fetchOvertime(userId: string) {
  const response = await API.getOvertime(userId);

  if (!response.ok) {
    if (response.status === 404) {
      return false;
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  const overtimePreference =
    result?.data?.overtimeAllowed ?? result?.data?.overtime_allowed;
  return Boolean(overtimePreference);
}

export async function updateOvertime(userId: string, overtimeAllowed: boolean) {
  return API.updateOvertime(userId, overtimeAllowed);
}

export async function assignGeofences(payload: {
  user_id: string;
  geofence_ids?: string[];
  assign_all?: boolean;
}) {
  return API.assignGeofencesToUser(payload);
}

export async function removeGeofence(payload: {
  user_id: string;
  geofence_id: string;
}) {
  return API.removeGeofenceFromUser(payload);
}

export async function fetchUserSchedules(userId: string) {
  const response = await API.getUserSchedule(userId);
  if (!response.ok) {
    return [];
  }

  const result = await response.json();
  if (Array.isArray(result)) {
    return result;
  }
  if (Array.isArray(result?.data)) {
    return result.data;
  }
  return [];
}

export async function fetchUserGeofences(userId: string) {
  const response = await API.getUserGeofences(userId);
  if (!response.ok) {
    return [];
  }

  const result = await response.json();
  if (
    result?.data?.assignments &&
    Array.isArray(result.data.assignments)
  ) {
    return result.data.assignments
      .map((assignment: any) => assignment.geofence)
      .filter((geofence: any) => Boolean(geofence));
  }

  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
}
