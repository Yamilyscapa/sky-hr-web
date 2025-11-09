import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPickerDialog } from "@/components/map-picker-dialog";
import { LocationData } from "@/components/map-picker";
import { useState, useEffect } from "react";
import { useOrganizationStore } from "@/store/organization-store";
import { Separator } from "@/components/ui/separator";
import { DataTableCard } from "@/components/ui/data-table-card";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { useReactTable } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Eye,
  MapPin,
  QrCode,
  Download,
  Copy,
} from "lucide-react";
import API from "@/api";

export const Route = createFileRoute("/(company)/locations")({
  component: RouteComponent,
});

type Location = {
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

function downloadQrCode(location: Location) {
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

// QR Code viewer component
function QRCodeViewer({ location }: { location: Location }) {
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
          <Button onClick={() => downloadQrCode(location)} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Descargar QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionsCell({
  location,
  onView,
  onOpenMap,
  onDownloadQr,
}: {
  location: Location;
  onView: (location: Location) => void;
  onOpenMap: (location: Location) => void;
  onDownloadQr: (location: Location) => void;
}) {
  const hasCoordinates = Boolean(location.center_latitude && location.center_longitude);
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

type LocationColumnHandlers = {
  onView: (location: Location) => void;
  onOpenMap: (location: Location) => void;
  onDownloadQr: (location: Location) => void;
};

const createColumns = ({
  onView,
  onOpenMap,
  onDownloadQr,
}: LocationColumnHandlers): ColumnDef<Location>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    header: ({ column }) => {
      return (
        <button
          className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Nombre</span>
          <ArrowUpDown className="h-4 w-4" />
        </button>
      );
    },
    accessorKey: "name",
    cell: (info) => info.getValue(),
    enableSorting: true,
  },
  {
    header: "Código QR",
    accessorKey: "qr_code_url",
    cell: ({ row }) => {
      return <QRCodeViewer location={row.original} />;
    },
  },
  {
    header: "Radio",
    accessorKey: "radius",
    cell: ({ row }) => {
      const radius = row.original.radius;
      return <span>{radius}m</span>;
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <ActionsCell
          location={row.original}
          onView={onView}
          onOpenMap={onOpenMap}
          onDownloadQr={onDownloadQr}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

async function handleCreateLocation(name: string, locationData: LocationData) {
  const { organization } = useOrganizationStore.getState();

  if (!organization || !organization.id) {
    throw new Error("Organization not found");
  }

  try {
    const response = await API.createGeofence(
      name,
      locationData.latitude.toString(),
      locationData.longitude.toString(),
      locationData.radius,
      organization.id,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error creating location:", error);
    throw error;
  }
}

function RouteComponent() {
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [name, setName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [detailsLocation, setDetailsLocation] = useState<Location | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { organization } = useOrganizationStore();

  const handleViewLocationDetails = (location: Location) => {
    setDetailsLocation(location);
  };

  const handleOpenLocationMap = (location: Location) => {
    if (!location.center_latitude || !location.center_longitude) {
      alert("No hay coordenadas disponibles para esta ubicación.");
      return;
    }

    const url = `https://www.google.com/maps?q=${location.center_latitude},${location.center_longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadLocationQr = (location: Location) => {
    downloadQrCode(location);
  };

  const columns = createColumns({
    onView: handleViewLocationDetails,
    onOpenMap: handleOpenLocationMap,
    onDownloadQr: handleDownloadLocationQr,
  });

  const table = useReactTable({
    data: locations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  const getSelectedLocations = () => table.getSelectedRowModel().rows.map((row) => row.original);

  const handleBulkDownloadQrs = () => {
    const selected = getSelectedLocations();
    if (selected.length === 0) {
      alert("Selecciona al menos una sucursal.");
      return;
    }

    const withQr = selected.filter((location) => location.qr_code_url);
    if (withQr.length === 0) {
      alert("Las sucursales seleccionadas no tienen códigos QR disponibles.");
      return;
    }

    setIsBulkProcessing(true);
    try {
      withQr.forEach((location, index) => {
        setTimeout(() => downloadQrCode(location), index * 150);
      });
    } finally {
      setTimeout(() => setIsBulkProcessing(false), withQr.length * 150 + 300);
    }
  };

  const handleBulkCopyCoordinates = async () => {
    const selected = getSelectedLocations();
    if (selected.length === 0) {
      alert("Selecciona al menos una sucursal.");
      return;
    }

    const coordinates = selected
      .filter((location) => location.center_latitude && location.center_longitude)
      .map(
        (location) =>
          `${location.name || "Ubicación"}: ${location.center_latitude}, ${location.center_longitude}`,
      );

    if (coordinates.length === 0) {
      alert("No hay coordenadas disponibles para copiar.");
      return;
    }

    const text = coordinates.join("\n");

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        alert("Coordenadas copiadas al portapapeles");
        return;
      } catch (error) {
        console.error("Error copiando coordenadas:", error);
      }
    }

    window.prompt("Copia manualmente las coordenadas:", text);
  };

  const locationBulkActions: ActionMenuItem[] = [
    {
      label: "Descargar QRs",
      icon: Download,
      action: handleBulkDownloadQrs,
      disabled: isBulkProcessing,
    },
    {
      label: "Copiar coordenadas",
      icon: Copy,
      action: handleBulkCopyCoordinates,
      disabled: isBulkProcessing,
    },
  ];

  const handleLocationConfirm = (location: LocationData) => {
    setLocationData(location);
  };

  async function fetchLocations() {
    if (!organization?.id) {
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

    try {
      const response = await fetch(
        `${API_URL}/geofence/get-by-organization?id=${organization.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let locationsList: Location[] = [];

      if (Array.isArray(data)) {
        locationsList = data;
      } else if (data.data && Array.isArray(data.data)) {
        locationsList = data.data;
      } else if (data.geofences && Array.isArray(data.geofences)) {
        locationsList = data.geofences;
      } else if (data.locations && Array.isArray(data.locations)) {
        locationsList = data.locations;
      }
      setLocations(locationsList);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  }

  useEffect(() => {
    if (organization?.id) {
      fetchLocations();
    }
  }, [organization?.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name) {
      alert("El nombre de la sucursal es requerido");
      return;
    }

    if (!locationData) {
      alert("La ubicación en el mapa es requerida");
      return;
    }

    if (!organization?.id) {
      alert("No se encontró la organización");
      return;
    }

    setIsSubmitting(true);
    try {
      await handleCreateLocation(name, locationData);
      alert("Sucursal creada exitosamente");
      // Reset form
      setName("");
      setLocationData(null);
      // Refresh locations list
      await fetchLocations();
    } catch (error) {
      alert("Error al crear la sucursal. Por favor, intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>Agregar sucursal</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Field>
              <Label htmlFor="location-name">Nombre de la sucursal</Label>
              <Input
                id="location-name"
                type="text"
                placeholder="Ejemplo: Sucursal Centro"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="location-map">Ubicación en el mapa</Label>
              <div className="space-y-2">
                <MapPickerDialog
                  trigger={
                    <Button
                      id="location-map"
                      type="button"
                      variant="outline"
                      className="w-fit"
                    >
                      {locationData
                        ? "Cambiar ubicación en el mapa"
                        : "Seleccionar ubicación en el mapa"}
                    </Button>
                  }
                  initialLocation={locationData || undefined}
                  onConfirm={handleLocationConfirm}
                />
              </div>
            </Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Agregar sucursal"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <DataTableCard
        title="Sucursales"
        table={table}
        selectedCount={table.getSelectedRowModel().rows.length}
        bulkActionLabel="Acciones masivas"
        bulkActions={locationBulkActions}
      />

      {detailsLocation && (
        <LocationDetailsDialog
          location={detailsLocation}
          open={Boolean(detailsLocation)}
          onOpenChange={(open) => {
            if (!open) {
              setDetailsLocation(null);
            }
          }}
        />
      )}
    </div>
  );
}

function LocationDetailsDialog({
  location,
  open,
  onOpenChange,
}: {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{location.name}</DialogTitle>
          <DialogDescription>
            Información de la sucursal seleccionada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Tipo</p>
            <p className="font-medium capitalize">{location.type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            <p className="font-medium">{location.active ? "Activa" : "Inactiva"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Coordenadas</p>
            {location.center_latitude && location.center_longitude ? (
              <p className="font-medium">
                {location.center_latitude}, {location.center_longitude}
              </p>
            ) : (
              <p className="font-medium">Sin coordenadas registradas</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Radio</p>
            <p className="font-medium">{location.radius} metros</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Código QR</p>
            <p className="font-medium">
              {location.qr_code_url ? "Disponible" : "No generado"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
