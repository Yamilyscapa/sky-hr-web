import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Visitor, VisitorsQueryParams } from "../types";
import { DEFAULT_PAGE_SIZE, VISITORS_QUERY_KEY } from "../data";
import { useVisitorsQuery } from "../hooks/useVisitorsQuery";
import { useVisitorActions } from "../hooks/useVisitorActions";
import { VisitorsTable } from "../components/VisitorsTable";
import { CreateVisitorDialog } from "../components/CreateVisitorDialog";
import { AccessAreasDialog } from "../components/AccessAreasDialog";
import { VisitorDetailsDialog } from "../components/VisitorDetailsDialog";
import { getOrgId } from "../utils";

export function VisitorsPage() {
  const [status, setStatus] =
    useState<VisitorsQueryParams["status"]>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsVisitor, setDetailsVisitor] = useState<Visitor | null>(null);
  const [accessAreasVisitor, setAccessAreasVisitor] =
    useState<Visitor | null>(null);
  const [accessAreasDialogOpen, setAccessAreasDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { approve, reject, cancel } = useVisitorActions();
  const organizationId = getOrgId();
  const pageSize = DEFAULT_PAGE_SIZE;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const visitorsQuery = useVisitorsQuery({
    status,
    searchTerm: debouncedSearchTerm.trim() || undefined,
    page,
    pageSize,
    organizationId,
  });

  const visitorsData = visitorsQuery.data;
  const visitors = visitorsData?.visitors ?? [];
  const pagination = visitorsData?.pagination ?? null;

  const handleViewDetails = (visitor: Visitor) => {
    setDetailsVisitor(visitor);
  };

  const handleViewAccessAreas = (visitor: Visitor) => {
    setAccessAreasVisitor(visitor);
    setAccessAreasDialogOpen(true);
  };

  const handleAccessAreasDialogChange = (open: boolean) => {
    setAccessAreasDialogOpen(open);
    if (!open) {
      setAccessAreasVisitor(null);
    }
  };

  const handleDetailsDialogChange = (open: boolean) => {
    if (!open) {
      setDetailsVisitor(null);
    }
  };

  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>Agregar visitante</CardTitle>
          <CardDescription>
            Registra un nuevo visitante con sus datos de acceso y fechas de
            entrada y salida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo visitante
          </Button>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Visitantes</CardTitle>
              <CardDescription>
                Gestiona los visitantes y sus solicitudes de acceso.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o acceso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as VisitorsQueryParams["status"])
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="approved">Aprobados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visitorsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Cargando visitantes...
            </div>
          ) : visitors.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {debouncedSearchTerm || status !== "all"
                ? "No se encontraron visitantes con los filtros aplicados."
                : "No hay visitantes registrados."}
            </div>
          ) : (
            <VisitorsTable
              visitors={visitors}
              pagination={pagination}
              page={page}
              pageSize={pageSize}
              isFetching={visitorsQuery.isFetching}
              onPageChange={setPage}
              onView={handleViewDetails}
              onViewAccessAreas={handleViewAccessAreas}
              onApprove={approve}
              onReject={reject}
              onCancel={cancel}
            />
          )}
        </CardContent>
      </Card>

      <CreateVisitorDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onComplete={() => {
          void queryClient.invalidateQueries({
            queryKey: VISITORS_QUERY_KEY,
            exact: false,
          });
        }}
      />

      <VisitorDetailsDialog
        visitor={detailsVisitor}
        open={Boolean(detailsVisitor)}
        onOpenChange={handleDetailsDialogChange}
      />

      <AccessAreasDialog
        visitor={accessAreasVisitor}
        open={accessAreasDialogOpen}
        onOpenChange={handleAccessAreasDialogChange}
      />
    </div>
  );
}
