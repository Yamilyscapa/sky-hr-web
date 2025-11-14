export type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  days_of_week: string[];
};

export type Geofence = {
  id: string;
  name: string;
  type: string;
  center_latitude: string;
  center_longitude: string;
  radius: number;
  active: boolean;
  qr_code_url?: string;
};

export type EmployeeStatus = "active" | "pending";

export type Employee = {
  id?: string;
  email: string;
  name: string;
  isCurrentUser?: boolean;
  status: EmployeeStatus;
  invitationId?: string;
  shift?: {
    id: string;
    name: string;
    color: string;
  };
  geofences?: Geofence[];
  role?: string;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  inviterId?: string;
  expiresAt?: string;
  createdAt?: string;
};
