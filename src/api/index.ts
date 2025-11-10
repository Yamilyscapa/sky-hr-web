export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedListResponse<T = any> = {
  message?: string;
  data?: T[] | { events?: T[] };
  pagination?: PaginationMeta;
  [key: string]: any;
};

export type SingleRecordResponse<T = any> = {
  message?: string;
  data?: T;
  [key: string]: any;
};

export type AnnouncementPriority = "normal" | "important" | "urgent";

export type AnnouncementPayload = {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  published_at: string;
  expires_at: string | null;
};

export type ApiAnnouncement = {
  id: string;
  organizationId: string | null;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type PermissionStatus = "pending" | "approved" | "rejected";

export type ApiPermission = {
  id: string;
  userId: string;
  organizationId: string;
  message: string;
  documentsUrl: string[];
  startingDate: string;
  endDate: string;
  status: PermissionStatus;
  approvedBy: string | null;
  supervisorComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export function extractListData<T = any>(
  response?: PaginatedListResponse<T> | any,
): T[] {
  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response as T[];
  }

  const data = response.data;
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && Array.isArray((data as { events?: T[] }).events)) {
    return (data as { events?: T[] }).events || [];
  }

  return [];
}

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

export class API {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_URL ?? "http://localhost:8080";
  }

  // Helper method to handle responses
  private async handleResponse<T = any>(response: Response): Promise<T> {
    if (!response.ok) {
      const text = await response.text();
      console.error(`HTTP error! status: ${response.status}`, text);

      let errorMessage = `HTTP error! status: ${response.status}`;
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(text);
        const maybeMessage = (parsedBody as { message?: string })?.message;
        if (maybeMessage) {
          errorMessage = maybeMessage;
        }
      } catch {
        // Not JSON, use default error message
      }

      throw new ApiClientError(errorMessage, response.status, parsedBody);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      if (text) {
        console.error("Expected JSON but got:", text);
      }
      // For successful responses without JSON, return undefined
      return undefined as T;
    }

    return await response.json();
  }

  // Generic API methods
  public async get(url: string) {
    return await fetch(`${this.baseUrl}${url}`, {
      method: "GET",
      credentials: "include",
    });
  }

  public async post(url: string, data: any) {
    return await fetch(`${this.baseUrl}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
  }

  public async put(url: string, data: any) {
    return await fetch(`${this.baseUrl}${url}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
  }

  public async delete(url: string) {
    return await fetch(`${this.baseUrl}${url}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
  }

  // Announcement API methods
  public async getAnnouncements(params?: {
    includeExpired?: boolean;
    includeFuture?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const searchParams = new URLSearchParams();
    const finalParams = {
      includeExpired: params?.includeExpired ? "true" : undefined,
      includeFuture: params?.includeFuture ? "true" : undefined,
      page: params?.page,
      pageSize: params?.pageSize,
    };

    Object.entries(finalParams).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      searchParams.append(key, String(value));
    });

    const queryString = searchParams.toString();
    const url = `/announcements${queryString ? `?${queryString}` : ""}`;
    const response = await this.get(url);
    return await this.handleResponse<PaginatedListResponse<ApiAnnouncement>>(response);
  }

  public async getAnnouncement(id: string) {
    const response = await this.get(`/announcements/${id}`);
    return await this.handleResponse<SingleRecordResponse<ApiAnnouncement>>(response);
  }

  public async createAnnouncement(data: AnnouncementPayload) {
    const response = await this.post(`/announcements`, data);
    
    return await this.handleResponse<SingleRecordResponse<ApiAnnouncement>>(response);
  }

  public async updateAnnouncement(id: string, data: AnnouncementPayload) {
    const response = await this.put(`/announcements/${id}`, data);
    return await this.handleResponse<SingleRecordResponse<ApiAnnouncement>>(response);
  }

  public async deleteAnnouncement(id: string) {
    const response = await this.delete(`/announcements/${id}`);
    return await this.handleResponse<SingleRecordResponse<{ id: string }>>(response);
  }

  // Geofence API methods
  public async createGeofence(
    name: string,
    center_latitude: string,
    center_longitude: string,
    radius: number,
    organization_id: string,
  ) {
    return await this.post("/geofence/create", {
      name,
      center_latitude,
      center_longitude,
      radius,
      organization_id,
    });
  }

  // Schedules/Shifts API methods
  public async createShift(data: {
    name: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    days_of_week: string[];
    color: string;
  }) {
    return await this.post("/schedules/shifts/create", data);
  }

  public async getShifts() {
    return await this.get("/schedules/shifts");
  }

  public async updateShift(id: string, data: Partial<{
    name: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    days_of_week: string[];
    color: string;
  }>) {
    return await fetch(`${this.baseUrl}/schedules/shifts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
  }

  public async assignShift(data: {
    user_id: string;
    shift_id: string;
    effective_from: string;
    effective_until?: string;
  }) {
    return await this.post("/schedules/assign", data);
  }

  public async getUserSchedule(userId: string) {
    return await this.get(`/schedules/user/${userId}`);
  }

  // User-Geofence API methods
  public async assignGeofencesToUser(data: {
    user_id: string;
    geofence_ids?: string[];
    assign_all?: boolean;
  }) {
    return await this.post("/user-geofence/assign", data);
  }

  public async removeGeofenceFromUser(data: {
    user_id: string;
    geofence_id: string;
  }) {
    return await this.post("/user-geofence/remove", data);
  }

  public async removeAllGeofencesFromUser(data: { user_id: string }) {
    return await this.post("/user-geofence/remove-all", data);
  }

  public async getUserGeofences(userId: string) {
    return await this.get(`/user-geofence/user-geofences?user_id=${userId}`);
  }

  public async getGeofenceUsers(geofenceId: string) {
    return await this.get(`/user-geofence/geofence-users?geofence_id=${geofenceId}`);
  }

  public async checkUserGeofenceAccess(data: {
    user_id: string;
    geofence_id: string;
  }) {
    return await this.post("/user-geofence/check-access", data);
  }

  public async getGeofencesByOrganization(organizationId: string, params?: {
    page?: number;
    pageSize?: number;
  }) {
    const searchParams = new URLSearchParams();
    const finalParams = {
      id: organizationId,
      page: params?.page,
      pageSize: params?.pageSize,
    };

    Object.entries(finalParams).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      searchParams.append(key, String(value));
    });

    const queryString = searchParams.toString();
    const url = `/geofence/get-by-organization${queryString ? `?${queryString}` : ""}`;
    const response = await this.get(url);
    return await this.handleResponse<PaginatedListResponse>(response);
  }

  // Attendance API methods
  public async getAttendanceEvents(params?: {
    user_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const searchParams = new URLSearchParams();
    const finalParams = {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      user_id: params?.user_id,
      start_date: params?.start_date,
      end_date: params?.end_date,
      status: params?.status,
    };

    Object.entries(finalParams).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      searchParams.append(key, String(value));
    });

    const queryString = searchParams.toString();
    const url = `/attendance/events${queryString ? `?${queryString}` : ""}`;
    const response = await this.get(url);
    return await this.handleResponse<PaginatedListResponse>(response);
  }

  public async getAttendanceReport() {
    const response = await this.get("/attendance/report");
    return await this.handleResponse(response);
  }

  public async validateQR(qr_data: string) {
    const response = await this.post("/attendance/qr/validate", { qr_data });
    return await this.handleResponse(response);
  }

  public async checkIn(formData: FormData) {
    const response = await fetch(`${this.baseUrl}/attendance/check-in`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return await this.handleResponse(response);
  }

  public async checkOut(formData: FormData) {
    const response = await fetch(`${this.baseUrl}/attendance/check-out`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return await this.handleResponse(response);
  }

  public async updateAttendanceStatus(eventId: string, data: {
    status: "on_time" | "late" | "early" | "absent" | "out_of_bounds";
    notes?: string;
  }) {
    const response = await this.put(`/attendance/admin/update-status/${eventId}`, data);
    return await this.handleResponse(response);
  }

  public async markAbsences(data?: {
    user_ids?: string[];
    date?: string; // YYYY-MM-DD format
    notes?: string;
  }) {
    const response = await this.post("/attendance/admin/mark-absences", data || {});
    return await this.handleResponse(response);
  }

  // Permissions API methods
  public async getPermissions(params?: {
    status?: PermissionStatus;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const searchParams = new URLSearchParams();
    const finalParams = {
      status: params?.status,
      userId: params?.userId,
      page: params?.page,
      pageSize: params?.pageSize,
    };

    Object.entries(finalParams).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      searchParams.append(key, String(value));
    });

    const queryString = searchParams.toString();
    const url = `/permissions${queryString ? `?${queryString}` : ""}`;
    const response = await this.get(url);
    return await this.handleResponse<PaginatedListResponse<ApiPermission>>(response);
  }

  public async getPendingPermissions(params?: {
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const searchParams = new URLSearchParams();
    const finalParams = {
      userId: params?.userId,
      page: params?.page,
      pageSize: params?.pageSize,
    };

    Object.entries(finalParams).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      searchParams.append(key, String(value));
    });

    const queryString = searchParams.toString();
    const url = `/permissions/pending${queryString ? `?${queryString}` : ""}`;
    const response = await this.get(url);
    return await this.handleResponse<PaginatedListResponse<ApiPermission>>(response);
  }

  public async getPermission(id: string) {
    const response = await this.get(`/permissions/${id}`);
    return await this.handleResponse<SingleRecordResponse<ApiPermission>>(response);
  }

  public async approvePermission(id: string, comment?: string) {
    const response = await this.post(`/permissions/${id}/approve`, {
      comment: comment || undefined,
    });
    return await this.handleResponse<SingleRecordResponse<ApiPermission>>(response);
  }

  public async rejectPermission(id: string, comment: string) {
    const response = await this.post(`/permissions/${id}/reject`, {
      comment,
    });
    return await this.handleResponse<SingleRecordResponse<ApiPermission>>(response);
  }

  public async addPermissionDocuments(id: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("documents", file);
    });

    const response = await fetch(`${this.baseUrl}/permissions/${id}/documents`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    return await this.handleResponse<SingleRecordResponse<ApiPermission>>(response);
  }
}

export default new API();
