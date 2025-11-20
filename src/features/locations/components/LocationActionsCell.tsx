import { Download, Eye, MapPin } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import type { Location } from "../types";

type LocationActionsCellProps = {
  location: Location;
  onView: (location: Location) => void;
  onOpenMap: (location: Location) => void;
  onDownloadQr: (location: Location) => void;
};

export function LocationActionsCell({
  location,
  onView,
  onOpenMap,
  onDownloadQr,
}: LocationActionsCellProps) {
  const hasCoordinates = Boolean(
    location.center_latitude && location.center_longitude,
  );
  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: Eye,
      action: () => onView(location),
    },
    {
      label: "Ver en mapa",
      icon: MapPin,
      action: () => onOpenMap(location),
      disabled: !hasCoordinates,
    },
    {
      label: "Descargar QR",
      icon: Download,
      action: () => onDownloadQr(location),
      disabled: !location.qr_code_url,
    },
  ];

  return <ActionMenu items={items} />;
}
