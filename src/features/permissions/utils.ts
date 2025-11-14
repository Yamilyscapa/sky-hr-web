import { format } from "date-fns";

export type UserInfo = {
  id: string;
  name: string;
  email: string;
};

export function formatDateRange(startDate: string, endDate: string) {
  try {
    const start = format(new Date(startDate), "dd/MM/yyyy");
    const end = format(new Date(endDate), "dd/MM/yyyy");
    return `${start} - ${end}`;
  } catch {
    return `${startDate} - ${endDate}`;
  }
}

export function formatDateTime(value: string) {
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}
