export type Location = {
  id: string;
  name: string;
  type: string;
  center_latitude: string;
  center_longitude: string;
  radius: number;
  coordinates: any | null;
  organization_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  qr_code_url?: string;
};
