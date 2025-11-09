"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

type ReactLeafletModule = typeof import("react-leaflet");
type LeafletModule = typeof import("leaflet");

interface LeafletRuntime {
  components: Pick<
    ReactLeafletModule,
    "MapContainer" | "TileLayer" | "Circle" | "Marker" | "useMapEvents"
  >;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

interface MapPickerProps {
  initialLocation?: LocationData;
  onLocationChange?: (location: LocationData) => void;
  minRadius?: number;
  maxRadius?: number;
  className?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function MapPicker({
  initialLocation = { latitude: 19.4326, longitude: -99.1332, radius: 100 }, // Default to Mexico City
  onLocationChange,
  minRadius = 25,
  maxRadius = 250,
  className = "",
}: MapPickerProps) {
  const [leafletRuntime, setLeafletRuntime] = useState<LeafletRuntime | null>(
    null,
  );
  const [location, setLocation] = useState<LocationData>(initialLocation);
  const [radius, setRadius] = useState(initialLocation.radius);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mapCenter = useMemo(
    () => [location.latitude, location.longitude] as [number, number],
    [location.latitude, location.longitude],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const loadLeaflet = async () => {
      try {
        const [
          leafletModule,
          reactLeafletModule,
          iconModule,
          iconShadowModule,
        ] = await Promise.all([
          import("leaflet"),
          import("react-leaflet"),
          import("leaflet/dist/images/marker-icon.png"),
          import("leaflet/dist/images/marker-shadow.png"),
        ]);

        if (cancelled) {
          return;
        }

        const iconUrl = (iconModule as { default: string }).default;
        const iconShadowUrl = (iconShadowModule as { default: string }).default;
        const leafletLib = leafletModule as LeafletModule & {
          default?: LeafletModule;
        };
        const L = (leafletLib.default ?? leafletLib) as unknown as {
          icon: LeafletModule["icon"];
          Marker: LeafletModule["Marker"];
        };

        const DefaultIcon = L.icon({
          iconUrl,
          shadowUrl: iconShadowUrl,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });

        L.Marker.prototype.options.icon = DefaultIcon;

        setLeafletRuntime({
          components: {
            MapContainer: reactLeafletModule.MapContainer,
            TileLayer: reactLeafletModule.TileLayer,
            Circle: reactLeafletModule.Circle,
            Marker: reactLeafletModule.Marker,
            useMapEvents: reactLeafletModule.useMapEvents,
          },
        });
      } catch (error) {
        console.error("Error loading Leaflet:", error);
      }
    };

    loadLeaflet();

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery,
          )}&limit=5&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "es",
            },
          },
        );
        const data = await response.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch (error) {
        console.error("Error searching address:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleMapClick = (lat: number, lng: number) => {
    const newLocation = { latitude: lat, longitude: lng, radius };
    setLocation(newLocation);
    onLocationChange?.(newLocation);
  };

  const handleRadiusChange = (newRadius: number) => {
    const clampedRadius = Math.max(minRadius, Math.min(maxRadius, newRadius));
    setRadius(clampedRadius);
    const newLocation = { ...location, radius: clampedRadius };
    setLocation(newLocation);
    onLocationChange?.(newLocation);
  };

  const handleSelectAddress = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const newLocation = { latitude: lat, longitude: lng, radius };
    setLocation(newLocation);
    onLocationChange?.(newLocation);
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  const renderMap = () => {
    if (!leafletRuntime) {
      return (
        <div className="rounded-lg overflow-hidden border border-border h-[300px] flex items-center justify-center bg-muted/10">
          <span className="text-sm text-muted-foreground">
            Cargando mapa...
          </span>
        </div>
      );
    }

    const { MapContainer, TileLayer, Circle, Marker, useMapEvents } =
      leafletRuntime.components;

    function MapEventHandler({
      onMapClick,
      center,
    }: {
      onMapClick: (lat: number, lng: number) => void;
      center: [number, number];
    }) {
      const map = useMapEvents({
        click: (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        },
      });
      const [lat, lng] = center;

      useEffect(() => {
        map.flyTo([lat, lng], map.getZoom(), {
          duration: 0.5,
        });
      }, [lat, lng, map]);

      return null;
    }

    return (
      <div
        className="rounded-lg overflow-hidden border border-border"
        style={{ height: "300px" }}
      >
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventHandler
            onMapClick={handleMapClick}
            center={mapCenter}
          />
          <Marker position={[location.latitude, location.longitude]} />
          <Circle
            center={[location.latitude, location.longitude]}
            radius={radius}
            pathOptions={{
              color: "#0051FE",
              fillColor: "#0051FE",
              fillOpacity: 0.2,
            }}
          />
        </MapContainer>
      </div>
    );
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {renderMap()}

      {/* Address Search */}
      <div className="relative">
        <div className="flex flex-col gap-2">
          <Label htmlFor="address-search">Buscar dirección</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="address-search"
              type="text"
              placeholder="Escribe una dirección, ciudad o lugar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="w-full pl-10"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Autocomplete Dropdown */}
        {showResults && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {isSearching ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Buscando...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  className="w-full px-4 py-3 text-left text-sm hover:bg-accent transition-colors cursor-pointer border-b border-border last:border-b-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectAddress(result);
                  }}
                >
                  <div className="font-medium text-foreground">
                    {result.display_name}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No se encontraron resultados
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="radius-input" className="text-sm font-medium">
          Radio del tolerancia (m)
        </label>
        <Input
          id="radius-input"
          type="number"
          min={minRadius}
          max={maxRadius}
          step={5}
          value={radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
        />
        <span className="text-xs text-muted-foreground">
          Entre {minRadius}m y {maxRadius}m
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Latitud:</span>
          <span className="font-mono font-medium">
            {location.latitude.toFixed(6)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">Longitud:</span>
          <span className="font-mono font-medium">
            {location.longitude.toFixed(6)}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Haz clic en el mapa para seleccionar la ubicación de la sucursal y usa
        el campo numérico para ajustar el radio del área de cobertura.
      </p>
    </div>
  );
}
