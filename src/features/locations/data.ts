import API, { extractListData } from "@/api";
import type { Location } from "./types";

export async function fetchLocations(organizationId: string) {
  const response = await API.getGeofencesByOrganization(organizationId);
  return extractListData<Location>(response);
}

export async function createLocation(payload: {
  name: string;
  latitude: string;
  longitude: string;
  radius: number;
  organizationId: string;
}) {
  return API.createGeofence(
    payload.name,
    payload.latitude,
    payload.longitude,
    payload.radius,
    payload.organizationId,
  );
}
