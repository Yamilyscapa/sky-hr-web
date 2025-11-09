/**
 * DASHBOARD DE ESTADÍSTICAS - SKYHR
 * 
 * ✅ ESTADÍSTICAS IMPLEMENTADAS (con datos reales de la API):
 * ----------------------------------------------------------
 * 1. Resumen de Asistencia
 *    - Asistencia global de la organización
 *    - Ausentismo promedio
 *    - Ranking de sucursales por porcentaje de asistencia
 *    - Tendencias trimestrales (últimos 3 meses)
 *    - Alertas automáticas cuando asistencia < 90%
 *    - Semáforo de desempeño (Excelente/Aceptable/Crítico)
 *    - Distribución de estados: on_time, late, early, absent, out_of_bounds
 * 
 * 2. Análisis por Ubicación (Geofences)
 *    - Comparación entre sucursales/puntos de venta
 *    - Empleados asignados por ubicación
 *    - Performance por geofence
 * 
 * ❌ TODO: ESTADÍSTICAS PENDIENTES (requieren endpoints adicionales):
 * -------------------------------------------------------------------
 * 1. INDICADORES DE COSTO:
 *    - TODO: Costo por ausentismo (necesita datos de salarios por empleado)
 *      Endpoint sugerido: GET /employees/salary-data
 *    - TODO: Costo por sustitución (necesita datos de reclutamiento)
 *      Endpoint sugerido: GET /hr/recruitment-costs
 *    - TODO: Costo de horas extra (necesita tracking de overtime)
 *      Endpoint sugerido: GET /attendance/overtime-report
 * 
 * 2. INDICADORES ESTRATÉGICOS:
 *    - TODO: Satisfacción del cliente (necesita sistema de encuestas)
 *      Endpoint sugerido: GET /feedback/customer-satisfaction
 *    - TODO: Productividad por hora (necesita datos de producción/output)
 *      Endpoint sugerido: GET /productivity/metrics
 *    - TODO: Correlación Asistencia/Ventas (necesita datos de ventas)
 *      Endpoint sugerido: GET /sales/daily-report
 *    - TODO: Retención de personal (necesita datos de rotación)
 *      Endpoint sugerido: GET /hr/retention-metrics
 *    - TODO: Clima laboral (necesita encuestas internas)
 *      Endpoint sugerido: GET /hr/employee-satisfaction
 * 
 * 3. ANÁLISIS AVANZADOS:
 *    - TODO: Predicción de ausentismo (ML)
 *    - TODO: Patrones de asistencia por día de la semana
 *    - TODO: Análisis de estacionalidad
 *    - TODO: Comparación con benchmarks de la industria
 */

import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/server/auth.server";
import { getOrganization, getUserOrganizations } from "@/server/organization.server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  ShoppingCart,
  Heart
} from "lucide-react";
import API, { PaginationMeta, extractListData } from "@/api";
import { useQuery } from "@tanstack/react-query";
import {
  buildMonthOptions,
  endOfMonth,
  formatMonthLabel,
  formatMonthValue,
  getMonthRangeStrings,
  isWithinRange,
  parseMonthValue,
  startOfMonth,
} from "@/lib/month-utils";
import { MonthPaginationControls } from "@/components/month-pagination-controls";
import { useOrganizationStore } from "@/store/organization-store";

export const Route = createFileRoute("/")({
  component: App,
  beforeLoad: async () => {
    const auth = await isAuthenticated();

    if (!auth) {
      throw redirect({ to: "/login", search: { redirect: "", token: "" } });
    }

    // Get current active organization
    const organization = await getOrganization();
    
    // If no active organization, check if user has any organizations
    if (!organization?.data) {
      const organizations = await getUserOrganizations();
      
      // If user has organizations, set the first one as active
      if (organizations?.data && organizations.data.length > 0) {
        // User has organizations but no active one - this will be handled by the app
        // For now, we'll just let them through and they can select an organization
      } else {
        // No organizations at all - redirect to getting started screen
        throw redirect({ to: "/getting-started" });
      }
    }
  },
});

// ============================================================================
// UTILIDADES PARA CALCULAR ESTADÍSTICAS
// ============================================================================

interface AttendanceEvent {
  id: string;
  user_id: string;
  geofence_id?: string;
  geofenceId?: string;
  location_id?: string;
  status: "on_time" | "late" | "early" | "absent" | "out_of_bounds";
  check_in?: string;
  check_out?: string;
  is_verified?: boolean;
  is_within_geofence?: boolean;
  latitude?: string;
  longitude?: string;
  distance_to_geofence_m?: number;
  face_confidence?: string;
  liveness_score?: string;
  spoof_flag?: boolean;
  shift_id?: string;
  source?: string;
  notes?: string;
  organization_id?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  geofence?: {
    id: string;
    name?: string;
  };
  location?: {
    id: string;
    name?: string;
  };
}

interface LocationStats {
  id: string;
  name: string;
  attendance: number;
  employees: number;
  status: "excellent" | "acceptable" | "critical";
  totalEvents: number;
  onTime: number;
  late: number;
  absent: number;
}

// Calcula el porcentaje de asistencia basado en eventos
function calculateAttendancePercentage(events: AttendanceEvent[] | any) {
  // Validar que events sea un array
  if (!Array.isArray(events)) {
    console.warn('calculateAttendancePercentage: events is not an array', events);
    return 0;
  }
  if (events.length === 0) return 0;
  const attendedEvents = events.filter(e => e.status !== "absent").length;
  return (attendedEvents / events.length) * 100;
}

// Determina el status basado en el porcentaje de asistencia
function getAttendanceStatus(percentage: number): "excellent" | "acceptable" | "critical" {
  if (percentage >= 95) return "excellent";
  if (percentage >= 90) return "acceptable";
  return "critical";
}

function getEventGeofenceId(event: AttendanceEvent): string | null {
  return (
    event.geofence_id ||
    event.geofenceId ||
    event.location_id ||
    event.geofence?.id ||
    event.location?.id ||
    null
  );
}

function resolveGeofenceName(geofence: any, fallbackIndex = 0) {
  return (
    geofence?.name ||
    geofence?.label ||
    geofence?.location_name ||
    geofence?.location?.name ||
    `Ubicación ${fallbackIndex + 1}`
  );
}

type AttendanceQueryFilters = {
  user_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
};

async function fetchAllAttendanceEvents(
  filters: AttendanceQueryFilters = {},
  pageSize = 100,
) {
  const events: AttendanceEvent[] = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await API.getAttendanceEvents({
      ...filters,
      page: currentPage,
      pageSize,
    });

    const pageEvents = extractListData<AttendanceEvent>(response);
    events.push(...pageEvents);

    const pagination = response?.pagination as PaginationMeta | undefined;
    if (!pagination) {
      break;
    }

    totalPages = pagination.totalPages || 1;
    if (currentPage >= totalPages) {
      break;
    }

    currentPage += 1;
  } while (currentPage <= totalPages);

  return events;
}

// ============================================================================
// DATOS MOCK PARA SECCIONES PENDIENTES (TODO: Reemplazar con APIs reales)
// ============================================================================
const mockCostsData = {
  absenteeism: 45820,
  replacement: 12350,
  overtime: 18940,
};

const mockStrategicData = {
  customerSatisfaction: 88.5,
  productivityPerHour: 145.3,
  salesCorrelation: 0.87,
  retention: 94.2,
};

function getStatusConfig(status: string) {
  switch (status) {
    case "excellent":
      return {
        color: "bg-green-500",
        text: "Excelente",
        icon: CheckCircle2,
        badge: "default",
      };
    case "acceptable":
      return {
        color: "bg-yellow-500",
        text: "Aceptable",
        icon: AlertCircle,
        badge: "secondary",
      };
    case "critical":
      return {
        color: "bg-red-500",
        text: "Crítico",
        icon: XCircle,
        badge: "destructive",
      };
    default:
      return {
        color: "bg-gray-500",
        text: "Desconocido",
        icon: AlertCircle,
        badge: "outline",
      };
  }
}

function App() {
  // ============================================================================
  // QUERIES PARA OBTENER DATOS REALES DE LA API
  // ============================================================================

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const selectedMonthValue = formatMonthValue(selectedMonth);
  const selectedMonthLabel = formatMonthLabel(selectedMonth);
  const monthOptions = useMemo(
    () => buildMonthOptions(selectedMonth),
    [selectedMonth],
  );
  const currentMonthValue = formatMonthValue(startOfMonth(new Date()));
  const isNextMonthDisabled = selectedMonthValue >= currentMonthValue;
  const previousMonthDate = useMemo(() => {
    const previous = startOfMonth(selectedMonth);
    previous.setMonth(previous.getMonth() - 1);
    return previous;
  }, [selectedMonth]);
  const previousMonthValue = formatMonthValue(previousMonthDate);

  const handlePreviousMonth = () => {
    setSelectedMonth((prev) => {
      const next = startOfMonth(prev);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) {
      return;
    }
    setSelectedMonth((prev) => {
      const next = startOfMonth(prev);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const handleSelectMonth = (value: string) => {
    const parsed = parseMonthValue(value);
    if (parsed) {
      setSelectedMonth(parsed);
    }
  };

  const { data: organization } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const org = await getOrganization();
      return org?.data || null;
    },
  });

  const setOrganizationStore = useOrganizationStore((state) => state.setOrganization);

  useEffect(() => {
    setOrganizationStore(organization ?? null);
  }, [organization, setOrganizationStore]);

  // Obtener geofences (sucursales/ubicaciones)
  const { data: geofences } = useQuery({
    queryKey: ["geofences", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const response = await API.getGeofencesByOrganization(organization.id);
      return extractListData(response);
    },
    enabled: !!organization?.id,
  });

  // Obtener todos los eventos de asistencia (mes actual)
  const { data: currentMonthEvents } = useQuery({
    queryKey: ["attendance-current-month", organization?.id, selectedMonthValue],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { startDate, endDate } = getMonthRangeStrings(selectedMonth);
      return await fetchAllAttendanceEvents({
        start_date: startDate,
        end_date: endDate,
      });
    },
  });

  // Obtener eventos del mes anterior para comparación
  const { data: previousMonthEvents } = useQuery({
    queryKey: ["attendance-previous-month", organization?.id, previousMonthValue],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { startDate, endDate } = getMonthRangeStrings(previousMonthDate);
      return await fetchAllAttendanceEvents({
        start_date: startDate,
        end_date: endDate,
      });
    },
  });

  // Obtener eventos de los últimos 3 meses para tendencias
  const { data: quarterlyData } = useQuery({
    queryKey: ["attendance-quarterly", organization?.id, selectedMonthValue],
    enabled: !!organization?.id,
    queryFn: async () => {
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const targetMonth = startOfMonth(selectedMonth);
        targetMonth.setMonth(targetMonth.getMonth() - i);
        const { startDate, endDate } = getMonthRangeStrings(targetMonth);
        const events = await fetchAllAttendanceEvents({
          start_date: startDate,
          end_date: endDate,
        });

        months.push({
          month: formatMonthLabel(targetMonth),
          attendance: calculateAttendancePercentage(events),
          events,
        });
      }
      return months;
    },
  });

  // Obtener reporte de eventos marcados (flagged)
  const { data: flaggedReport } = useQuery({
    queryKey: ["attendance-flagged", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const response = await API.getAttendanceReport();
      console.log('📊 Flagged Report Response:', response);
      return response?.data || { flagged_count: 0, flagged_events: [] };
    },
  });

  // ============================================================================
  // CÁLCULOS DE ESTADÍSTICAS BASADOS EN DATOS REALES
  // ============================================================================

  // Asegurar que siempre trabajamos con arrays
  const currentEvents = Array.isArray(currentMonthEvents) ? currentMonthEvents : [];
  const previousEvents = Array.isArray(previousMonthEvents) ? previousMonthEvents : [];
  const flaggedEventsList: AttendanceEvent[] = Array.isArray(flaggedReport?.flagged_events)
    ? flaggedReport.flagged_events
    : [];
  const flaggedEventsForMonth: AttendanceEvent[] = flaggedEventsList.filter((event: AttendanceEvent) =>
    isWithinRange(event.check_in, startOfMonth(selectedMonth), endOfMonth(selectedMonth)),
  );
  const flaggedCount = flaggedEventsForMonth.length;
  const flaggedStats = flaggedEventsForMonth.reduce<Record<string, number>>(
    (acc: Record<string, number>, event: AttendanceEvent) => {
      const key = event.status || "other";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const flaggedStatusMeta = [
    { key: "late", label: "Tardanzas", accent: "text-orange-600", bar: "bg-orange-200" },
    { key: "absent", label: "Ausencias", accent: "text-red-600", bar: "bg-red-200" },
    { key: "out_of_bounds", label: "Fuera de zona", accent: "text-yellow-600", bar: "bg-yellow-200" },
  ];

  // Asistencia global
  const globalAttendance = calculateAttendancePercentage(currentEvents);
  const globalAbsenteeism = 100 - globalAttendance;
  const previousAttendance = calculateAttendancePercentage(previousEvents);
  const trend = globalAttendance - previousAttendance;

  // Estadísticas adicionales por status
  const statusStats = {
    onTime: currentEvents.filter((e: AttendanceEvent) => e.status === "on_time").length,
    late: currentEvents.filter((e: AttendanceEvent) => e.status === "late").length,
    early: currentEvents.filter((e: AttendanceEvent) => e.status === "early").length,
    absent: currentEvents.filter((e: AttendanceEvent) => e.status === "absent").length,
    outOfBounds: currentEvents.filter((e: AttendanceEvent) => e.status === "out_of_bounds").length,
  };

  // Promedio de confianza biométrica
  const eventsWithFace = currentEvents.filter((e: AttendanceEvent) => e.face_confidence);
  const avgFaceConfidence = eventsWithFace.length > 0
    ? eventsWithFace.reduce((sum: number, e: AttendanceEvent) => 
        sum + parseFloat(e.face_confidence || "0"), 0) / eventsWithFace.length
    : 0;

  // Eventos dentro/fuera del geofence
  const withinGeofence = currentEvents.filter((e: AttendanceEvent) => e.is_within_geofence).length;
  const outsideGeofence = currentEvents.filter((e: AttendanceEvent) => !e.is_within_geofence).length;

  // Calcular estadísticas por ubicación (geofence)
  const geofenceList = useMemo(() => {
    const list = Array.isArray(geofences) ? geofences : [];
    if (list.length > 0) {
      return list;
    }

    const derived = new Map<string, any>();
    currentEvents.forEach((event: AttendanceEvent) => {
      const geofenceId = getEventGeofenceId(event);
      if (!geofenceId || derived.has(geofenceId)) {
        return;
      }
      const derivedName =
        event.geofence?.name ||
        event.location?.name ||
        `Ubicación ${derived.size + 1}`;
      derived.set(geofenceId, { id: geofenceId, name: derivedName });
    });

    return Array.from(derived.values());
  }, [geofences, currentEvents]);

  const locationStats: LocationStats[] = geofenceList.map((geofence: any, index) => {
    const locationEvents = currentEvents.filter(
      (e: AttendanceEvent) => getEventGeofenceId(e) === geofence.id,
    );
    const uniqueUsers = new Set(locationEvents.map((e: AttendanceEvent) => e.user_id));
    const attendance = calculateAttendancePercentage(locationEvents);

    return {
      id: geofence.id,
      name: resolveGeofenceName(geofence, index),
      attendance: Math.round(attendance * 10) / 10,
      employees: uniqueUsers.size,
      status: getAttendanceStatus(attendance),
      totalEvents: locationEvents.length,
      onTime: locationEvents.filter((e: AttendanceEvent) => e.status === "on_time").length,
      late: locationEvents.filter((e: AttendanceEvent) => e.status === "late").length,
      absent: locationEvents.filter((e: AttendanceEvent) => e.status === "absent").length,
    };
  });

  // Filtrar ubicaciones críticas para alertas
  const criticalLocations = locationStats.filter((loc) => loc.attendance < 90);

  // Total de empleados únicos
  const totalEmployees = new Set(currentEvents.map((e: AttendanceEvent) => e.user_id)).size;

  // Datos para tendencias trimestrales
  const quarterlyTrends = Array.isArray(quarterlyData) ? quarterlyData : [];

  // Estado de carga
  const isLoading = !currentMonthEvents || !geofences;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Estadísticas</h1>
          <p className="text-muted-foreground">
            Resumen completo de asistencia, costos e indicadores estratégicos. Mes seleccionado:{" "}
            <span className="font-medium text-foreground">{selectedMonthLabel}</span>
          </p>
        </div>
        <MonthPaginationControls
          selectedValue={selectedMonthValue}
          options={monthOptions}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
          onSelect={handleSelectMonth}
          disableNext={isNextMonthDisabled}
        />
      </div>

      {/* Alertas Críticas */}
      {criticalLocations.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>¡Alertas de Asistencia!</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                {criticalLocations.length} {criticalLocations.length === 1 ? "sucursal tiene" : "sucursales tienen"} una asistencia por debajo del 90%:
              </p>
              <div className="flex flex-wrap gap-2">
                {criticalLocations.map((loc) => (
                  <Badge key={loc.id} variant="destructive">
                    {loc.name}
                  </Badge>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Global</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalAttendance.toFixed(1)}%</div>
            <div className={`flex items-center text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs mes anterior
            </div>
            <Progress value={globalAttendance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ausentismo Promedio</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalAbsenteeism.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              {globalAbsenteeism <= 5 ? "Dentro del objetivo (≤5%)" : "Por encima del objetivo del 5%"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucursales Activas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locationStats.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {locationStats.filter((l) => l.status === "excellent").length} con desempeño excelente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Con registros de asistencia este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Eventos Marcados (Flagged) */}
      {flaggedCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">Resumen de eventos marcados</CardTitle>
                <CardDescription>
                  {selectedMonthLabel}: {flaggedCount} registro(s) con tardanza, ausencia o fuera de zona.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {flaggedStatusMeta.map(({ key, label, accent, bar }) => (
                <div key={key} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>{label}</span>
                    <span className={accent}>{flaggedStats[key] ?? 0}</span>
                  </div>
                  <div className={`mt-2 h-2 w-full rounded-full ${bar}`} />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Usa este resumen para priorizar revisiones y mantener el registro mensual actualizado.
              </p>
              <Button size="sm" asChild>
                <Link to="/attendance">Gestionar asistencia</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs para diferentes secciones */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="costs">Costos</TabsTrigger>
          <TabsTrigger value="strategic">Indicadores Estratégicos</TabsTrigger>
        </TabsList>

        {/* Tab de Asistencia */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Resumen por ubicación */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Resumen de Ubicaciones</CardTitle>
                <CardDescription>
                  Detalle de asistencia y eventos por sucursal/geofence
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locationStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay sucursales configuradas o sin datos de asistencia
                  </div>
                ) : (
                  <div className="space-y-4">
                    {locationStats.map((location, index) => {
                      const config = getStatusConfig(location.status);
                      const Icon = config.icon;
                      return (
                        <div
                          key={location.id}
                          className="rounded-lg border p-4 space-y-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Ubicación #{index + 1}</p>
                              <p className="text-lg font-semibold">{location.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {location.employees} empleado(s) • {location.totalEvents} evento(s)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold">{location.attendance}%</p>
                              <Badge variant={config.badge as any} className="mt-1 inline-flex items-center gap-1">
                                <Icon className="h-3 w-3" />
                                {config.text}
                              </Badge>
                            </div>
                          </div>

                          <Progress
                            value={location.attendance}
                            className="[&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-emerald-600"
                          />

                          <div className="grid gap-3 md:grid-cols-4 text-sm">
                            <div className="rounded-md bg-muted p-3">
                              <p className="text-xs text-muted-foreground">A tiempo</p>
                              <p className="text-base font-semibold text-green-600">
                                {location.onTime}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted p-3">
                              <p className="text-xs text-muted-foreground">Tarde</p>
                              <p className="text-base font-semibold text-orange-600">
                                {location.late}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted p-3">
                              <p className="text-xs text-muted-foreground">Ausente</p>
                              <p className="text-base font-semibold text-red-600">
                                {location.absent}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted p-3">
                              <p className="text-xs text-muted-foreground">Eventos totales</p>
                              <p className="text-base font-semibold">{location.totalEvents}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tendencias Trimestrales */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencias Trimestrales</CardTitle>
                <CardDescription>Evolución de los últimos 3 meses</CardDescription>
              </CardHeader>
              <CardContent>
                {quarterlyTrends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando datos trimestrales...
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {quarterlyTrends.map((month, index) => {
                        const prevMonth = quarterlyTrends[index - 1];
                        const monthTrend = prevMonth
                          ? month.attendance - prevMonth.attendance
                          : 0;
                        return (
                          <div key={month.month} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">{month.month}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">
                                  {month.attendance.toFixed(1)}%
                                </span>
                                {index > 0 && (
                                  <span
                                    className={`text-xs ${
                                      monthTrend > 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {monthTrend > 0 ? "+" : ""}
                                    {monthTrend.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <Progress value={month.attendance} />
                          </div>
                        );
                      })}
                    </div>
                    {quarterlyTrends.length >= 2 && (
                      <div className="mt-6 rounded-lg bg-muted p-4">
                        <div className="flex items-center gap-2">
                          {quarterlyTrends[quarterlyTrends.length - 1].attendance >= 
                           quarterlyTrends[0].attendance ? (
                            <>
                              <TrendingUp className="h-5 w-5 text-green-600" />
                              <div>
                                <div className="text-sm font-medium">Tendencia Positiva</div>
                                <div className="text-xs text-muted-foreground">
                                  La asistencia ha mejorado{" "}
                                  {(
                                    quarterlyTrends[quarterlyTrends.length - 1].attendance -
                                    quarterlyTrends[0].attendance
                                  ).toFixed(1)}
                                  % en el trimestre
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-5 w-5 text-red-600" />
                              <div>
                                <div className="text-sm font-medium">Tendencia Negativa</div>
                                <div className="text-xs text-muted-foreground">
                                  La asistencia ha disminuido{" "}
                                  {Math.abs(
                                    quarterlyTrends[quarterlyTrends.length - 1].attendance -
                                    quarterlyTrends[0].attendance
                                  ).toFixed(1)}
                                  % en el trimestre
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Semáforo de Desempeño */}
            <Card>
              <CardHeader>
                <CardTitle>Semáforo de Desempeño</CardTitle>
                <CardDescription>Distribución de sucursales por nivel</CardDescription>
              </CardHeader>
              <CardContent>
                {locationStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay datos para mostrar
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <span className="text-sm">Excelente (&gt; 95%)</span>
                        </div>
                        <span className="text-sm font-bold">
                          {locationStats.filter((l) => l.status === "excellent").length}{" "}
                          {locationStats.filter((l) => l.status === "excellent").length === 1 
                            ? "sucursal" 
                            : "sucursales"}
                        </span>
                      </div>
                      <Progress
                        value={
                          locationStats.length > 0
                            ? (locationStats.filter((l) => l.status === "excellent").length /
                                locationStats.length) *
                              100
                            : 0
                        }
                        className="[&>div]:bg-green-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-yellow-500" />
                          <span className="text-sm">Aceptable (90-94%)</span>
                        </div>
                        <span className="text-sm font-bold">
                          {locationStats.filter((l) => l.status === "acceptable").length}{" "}
                          {locationStats.filter((l) => l.status === "acceptable").length === 1 
                            ? "sucursal" 
                            : "sucursales"}
                        </span>
                      </div>
                      <Progress
                        value={
                          locationStats.length > 0
                            ? (locationStats.filter((l) => l.status === "acceptable").length /
                                locationStats.length) *
                              100
                            : 0
                        }
                        className="[&>div]:bg-yellow-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <span className="text-sm">Crítico (&lt; 90%)</span>
                        </div>
                        <span className="text-sm font-bold">
                          {locationStats.filter((l) => l.status === "critical").length}{" "}
                          {locationStats.filter((l) => l.status === "critical").length === 1 
                            ? "sucursal" 
                            : "sucursales"}
                        </span>
                      </div>
                      <Progress
                        value={
                          locationStats.length > 0
                            ? (locationStats.filter((l) => l.status === "critical").length /
                                locationStats.length) *
                              100
                            : 0
                        }
                        className="[&>div]:bg-red-500"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Detalles */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Distribución por Status */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
                <CardDescription>
                  Desglose de eventos de asistencia por status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">A Tiempo</span>
                      </div>
                      <span className="text-sm font-bold">{statusStats.onTime} eventos</span>
                    </div>
                    <Progress 
                      value={currentEvents.length > 0 ? (statusStats.onTime / currentEvents.length) * 100 : 0} 
                      className="[&>div]:bg-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">Tardanzas</span>
                      </div>
                      <span className="text-sm font-bold">{statusStats.late} eventos</span>
                    </div>
                    <Progress 
                      value={currentEvents.length > 0 ? (statusStats.late / currentEvents.length) * 100 : 0} 
                      className="[&>div]:bg-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Entrada Temprana</span>
                      </div>
                      <span className="text-sm font-bold">{statusStats.early} eventos</span>
                    </div>
                    <Progress 
                      value={currentEvents.length > 0 ? (statusStats.early / currentEvents.length) * 100 : 0} 
                      className="[&>div]:bg-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Ausencias</span>
                      </div>
                      <span className="text-sm font-bold">{statusStats.absent} eventos</span>
                    </div>
                    <Progress 
                      value={currentEvents.length > 0 ? (statusStats.absent / currentEvents.length) * 100 : 0} 
                      className="[&>div]:bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Fuera de Zona</span>
                      </div>
                      <span className="text-sm font-bold">{statusStats.outOfBounds} eventos</span>
                    </div>
                    <Progress 
                      value={currentEvents.length > 0 ? (statusStats.outOfBounds / currentEvents.length) * 100 : 0} 
                      className="[&>div]:bg-yellow-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verificación Biométrica */}
            <Card>
              <CardHeader>
                <CardTitle>Verificación Biométrica</CardTitle>
                <CardDescription>
                  Estadísticas de reconocimiento facial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Confianza Promedio</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {avgFaceConfidence.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={avgFaceConfidence} className="[&>div]:bg-blue-500" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Basado en {eventsWithFace.length} verificaciones biométricas
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Eventos Verificados</span>
                        <span className="text-sm font-bold text-green-600">
                          {currentEvents.filter((e: AttendanceEvent) => e.is_verified).length}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Sin Verificar</span>
                        <span className="text-sm font-bold text-orange-600">
                          {currentEvents.filter((e: AttendanceEvent) => !e.is_verified).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validación de Geofence */}
            <Card>
              <CardHeader>
                <CardTitle>Validación de Ubicación</CardTitle>
                <CardDescription>
                  Control de geofencing y perímetro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        Dentro del Geofence
                      </span>
                      <span className="text-2xl font-bold text-green-600">{withinGeofence}</span>
                    </div>
                    <Progress 
                      value={currentEvents.length > 0 ? (withinGeofence / currentEvents.length) * 100 : 0} 
                      className="[&>div]:bg-green-600"
                    />
                  </div>

                  <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-900 dark:text-red-100">
                        Fuera del Geofence
                      </span>
                      <span className="text-2xl font-bold text-red-600">{outsideGeofence}</span>
                    </div>
                    <Progress 
                      value={currentEvents.length > 0 ? (outsideGeofence / currentEvents.length) * 100 : 0} 
                      className="[&>div]:bg-red-600"
                    />
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    {currentEvents.length > 0 && (
                      <>
                        {((withinGeofence / currentEvents.length) * 100).toFixed(1)}% de cumplimiento geográfico
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total de Eventos */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen General</CardTitle>
                <CardDescription>
                  Métricas generales del mes actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <span className="font-medium">Total de Eventos</span>
                    <span className="text-2xl font-bold">{currentEvents.length}</span>
                  </div>
                  
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xs text-muted-foreground">Empleados Activos</div>
                      <div className="text-lg font-bold">{totalEmployees}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xs text-muted-foreground">Sucursales</div>
                      <div className="text-lg font-bold">{locationStats.length}</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xs text-muted-foreground">Eventos Marcados</div>
                      <div className="text-lg font-bold text-red-600">
                        {flaggedCount}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xs text-muted-foreground">Tasa de Asistencia</div>
                      <div className="text-lg font-bold text-green-600">
                        {globalAttendance.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Costos - TODO: Reemplazar con datos reales cuando estén disponibles los endpoints */}
        <TabsContent value="costs" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Datos Simulados</AlertTitle>
            <AlertDescription>
              Esta sección muestra datos de ejemplo. Se requieren endpoints adicionales para mostrar datos reales de costos.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Costo por Ausentismo
                </CardTitle>
                <DollarSign className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${mockCostsData.absenteeism.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Horas perdidas × salario promedio/hora
                </p>
                <div className="mt-4 space-y-1">
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Horas perdidas:</span>
                    <span className="font-medium">1,246 hrs</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Salario promedio/hr:</span>
                    <span className="font-medium">$36.75</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Costo por Sustitución
                </CardTitle>
                <Users className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${mockCostsData.replacement.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Reclutamiento + entrenamiento
                </p>
                <div className="mt-4 space-y-1">
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Nuevas contrataciones:</span>
                    <span className="font-medium">8 personas</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Costo promedio:</span>
                    <span className="font-medium">$1,543.75</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Costo de Horas Extra
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${mockCostsData.overtime.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Horas extra × tarifa premium
                </p>
                <div className="mt-4 space-y-1">
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Horas extra:</span>
                    <span className="font-medium">342 hrs</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Tarifa extra/hr:</span>
                    <span className="font-medium">$55.40</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Costos</CardTitle>
              <CardDescription>
                Impacto financiero total del mes actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <span className="font-medium">Costo Total Mensual</span>
                  <span className="text-2xl font-bold">
                    $
                    {(
                      mockCostsData.absenteeism +
                      mockCostsData.replacement +
                      mockCostsData.overtime
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
                    <div className="text-sm text-red-900 dark:text-red-100">
                      Ausentismo
                    </div>
                    <div className="text-lg font-bold text-red-600">
                      {(
                        (mockCostsData.absenteeism /
                          (mockCostsData.absenteeism +
                            mockCostsData.replacement +
                            mockCostsData.overtime)) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                  <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-950">
                    <div className="text-sm text-orange-900 dark:text-orange-100">
                      Sustitución
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      {(
                        (mockCostsData.replacement /
                          (mockCostsData.absenteeism +
                            mockCostsData.replacement +
                            mockCostsData.overtime)) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      Horas Extra
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {(
                        (mockCostsData.overtime /
                          (mockCostsData.absenteeism +
                            mockCostsData.replacement +
                            mockCostsData.overtime)) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Indicadores Estratégicos - TODO: Reemplazar con datos reales cuando estén disponibles los endpoints */}
        <TabsContent value="strategic" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Datos Simulados</AlertTitle>
            <AlertDescription>
              Esta sección muestra datos de ejemplo. Se requieren endpoints adicionales para mostrar datos reales de indicadores estratégicos.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Satisfacción del Cliente
                </CardTitle>
                <Heart className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockStrategicData.customerSatisfaction}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Correlación con asistencia del personal
                </p>
                <Progress
                  value={mockStrategicData.customerSatisfaction}
                  className="mt-4"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Productividad por Hora
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockStrategicData.productivityPerHour} u/h
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Unidades producidas por hora trabajada
                </p>
                <div className="mt-4 flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +8.3% vs mes anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Correlación Asistencia/Ventas
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockStrategicData.salesCorrelation}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Índice de correlación (0-1)
                </p>
                <div className="mt-4">
                  <Badge variant="default" className="bg-purple-600">
                    Correlación Fuerte
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Retención de Personal
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockStrategicData.retention}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Clima laboral y satisfacción
                </p>
                <Progress value={mockStrategicData.retention} className="mt-4" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Análisis de Correlaciones</CardTitle>
              <CardDescription>
                Relación entre asistencia e indicadores clave de negocio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Asistencia → Satisfacción del Cliente
                    </span>
                    <span className="text-sm font-bold text-green-600">Positiva</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Mayor asistencia del personal se correlaciona con mejor atención al
                    cliente
                  </p>
                  <Progress value={88} className="[&>div]:bg-green-500" />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Asistencia → Productividad
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      Muy Positiva
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    La productividad aumenta significativamente con mejor asistencia
                  </p>
                  <Progress value={92} className="[&>div]:bg-green-500" />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Asistencia → Ventas</span>
                    <span className="text-sm font-bold text-green-600">Positiva</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Las ventas diarias mejoran cuando hay mayor cobertura de personal
                  </p>
                  <Progress value={87} className="[&>div]:bg-green-500" />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Clima Laboral → Retención
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      Muy Positiva
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Un mejor clima laboral reduce la rotación de personal
                  </p>
                  <Progress value={94} className="[&>div]:bg-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
