import API from "@/api";
import type { Shift } from "./types";

export async function fetchShifts() {
  const response = await API.getShifts();

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (Array.isArray(result)) {
    return result as Shift[];
  }

  if (result.data && Array.isArray(result.data)) {
    return result.data as Shift[];
  }

  return [];
}

export async function createShift(payload: {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  days_of_week: string[];
  color: string;
}) {
  return API.createShift(payload);
}

export async function updateShift(
  shiftId: string,
  payload: Partial<{
    name: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    days_of_week: string[];
    color: string;
    active: boolean;
  }>,
) {
  return API.updateShift(shiftId, payload);
}
