import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";
import type { Location } from "../types";

type LocationQrViewerProps = {
  location: Location;
  onDownload: (location: Location) => void;
};

export function LocationQrViewer({
  location,
  onDownload,
}: LocationQrViewerProps) {
  if (!location.qr_code_url) {
    return <span className="text-sm text-gray-400">No disponible</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          Ver QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR - {location.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-4 rounded-lg border">
            <img
              src={location.qr_code_url}
              alt={`QR Code for ${location.name}`}
              className="w-64 h-64 object-contain"
            />
          </div>
          <Button onClick={() => onDownload(location)} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Descargar QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
