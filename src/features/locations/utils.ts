import type { Location } from "./types";

export function downloadQrCode(location: Location) {
  if (!location.qr_code_url) {
    alert("No hay un código QR disponible para esta sucursal.");
    return;
  }

  const link = document.createElement("a");
  link.href = location.qr_code_url;
  link.download = `${location.name || "ubicacion"}-qr.png`;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
