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
      try {
        const errorData = JSON.parse(text);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Not JSON, use default error message
      }
      
      throw new Error(errorMessage);
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

  public async getGeofencesByOrganization(organizationId: string) {
    return await this.get(`/geofence/get-by-organization?id=${organizationId}`);
  }

  // Attendance API methods
  public async getAttendanceReport(params?: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
    status?: string;
  }) {
    const queryParams = params ? new URLSearchParams(params as any).toString() : "";
    const url = `/attendance/report${queryParams ? `?${queryParams}` : ""}`;
    const response = await this.get(url);
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
}

export default new API();
