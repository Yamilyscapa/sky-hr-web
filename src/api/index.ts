export class API {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_URL ?? "http://localhost:8080";
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
}

export default new API();
