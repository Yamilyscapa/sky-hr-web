import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataTableCard } from "@/components/ui/data-table-card";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { useReactTable } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { ArrowUpDown, Eye, CheckCircle, XCircle, Ban, Plus, Search, X, Clock } from "lucide-react";
import { toast } from "sonner";
import API, { type ApiVisitor, type VisitorStatus, type PaginationMeta, extractListData } from "@/api";

function getOrgId() {
  try {
    const keys = ['activeOrganizationId', 'organizationId', 'orgId', 'active_org_id'];
    for (const k of keys) { const v = localStorage.getItem(k); if (v) return v; }
    // @ts-expect-error
    if (typeof window !== 'undefined' && window.__ORG_ID__) return window.__ORG_ID__ as string;
  } catch { }
  return undefined;
}

type Visitor = ApiVisitor;

// Create Visitor Dialog Component
function CreateVisitorDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const [accessAreas, setAccessAreas] = useState<string[]>([]);
  const [accessAreaInput, setAccessAreaInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAccessArea = (area: string) => {
    const trimmedArea = area.trim().toLowerCase();
    if (trimmedArea && !accessAreas.includes(trimmedArea)) {
      setAccessAreas([...accessAreas, trimmedArea]);
      setAccessAreaInput("");
    }
  };

  const handleRemoveAccessArea = (areaToRemove: string) => {
    setAccessAreas(accessAreas.filter(area => area !== areaToRemove));
  };

  const handleAccessAreaInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAccessArea(accessAreaInput);
    } else if (e.key === ',' && accessAreaInput.trim()) {
      e.preventDefault();
      handleAddAccessArea(accessAreaInput);
    } else if (e.key === 'Backspace' && !accessAreaInput && accessAreas.length > 0) {
      // Remove last area if backspace is pressed on empty input
      setAccessAreas(accessAreas.slice(0, -1));
    }
  };

  const handleAccessAreaInputBlur = () => {
    if (accessAreaInput.trim()) {
      handleAddAccessArea(accessAreaInput);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = e.currentTarget as HTMLFormElement | null;
    if (!form) {
      toast.error("No se pudo leer el formulario");
      setIsSubmitting(false);
      return;
    }

    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const entryDateStr = String(fd.get("entryDate") || "");
    const exitDateStr = String(fd.get("exitDate") || "");

    if (!name || accessAreas.length === 0 || !entryDateStr || !exitDateStr) {
      toast.error("Completa todos los campos");
      setIsSubmitting(false);
      return;
    }

    const entryDate = new Date(entryDateStr);
    const exitDate = new Date(exitDateStr);
    if (entryDate > exitDate) {
      toast.error("La entrada debe ser antes o igual a la salida");
      setIsSubmitting(false);
      return;
    }

    const orgId = getOrgId();

    try {
      await API.createVisitor({
        name,
        accessAreas: accessAreas,
        entryDate: entryDate.toISOString(),
        exitDate: exitDate.toISOString(),
        approveNow: false,
      }, orgId);

      toast.success("Visitante creado");
      setAccessAreas([]);
      setAccessAreaInput("");
      form.reset();
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al crear el visitante");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo visitante</DialogTitle>
          <DialogDescription>
            Introduce nombre, accesos y fechas. Todos los campos son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor="visitor-name">Nombre</Label>
            <Input
              id="visitor-name"
              name="name"
              placeholder="Nombre completo del visitante"
              required
            />
          </Field>
          <Field>
            <Label htmlFor="visitor-access">Lugares de acceso *</Label>

            {/* Tags display area */}
            {accessAreas.length > 0 && (
              <div className="border rounded-md p-3 bg-gray-50/50 max-h-[150px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {accessAreas.map((area, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                    >
                      <span>{area}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccessArea(area)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input field */}
            <Input
              id="visitor-access"
              type="text"
              placeholder={accessAreas.length === 0 ? "Escribe un lugar de acceso y presiona Enter o coma" : "Agregar más lugares de acceso..."}
              value={accessAreaInput}
              onChange={(e) => setAccessAreaInput(e.target.value)}
              onKeyDown={handleAccessAreaInputKeyDown}
              onBlur={handleAccessAreaInputBlur}
              className="h-10"
            />

            <p className="text-xs text-muted-foreground mt-1">
              Presiona Enter o coma para agregar cada lugar. Click en la X para remover.
            </p>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="visitor-entry">Fecha y hora de entrada</Label>
              <Input
                id="visitor-entry"
                name="entryDate"
                type="datetime-local"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="visitor-exit">Fecha y hora de salida</Label>
              <Input
                id="visitor-exit"
                name="exitDate"
                type="datetime-local"
                required
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear visitante"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Access Areas Dialog Component
function AccessAreasDialog({
  visitor,
  open,
  onOpenChange,
}: {
  visitor: Visitor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!visitor) return null;

  const accessAreas = Array.isArray(visitor.accessAreas)
    ? visitor.accessAreas
    : (visitor.accessAreas ? [visitor.accessAreas] : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lugares de acceso</DialogTitle>
          <DialogDescription>
            Lugares de acceso para {visitor.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {accessAreas.length > 0 ? (
            <ul className="list-disc list-inside space-y-2">
              {accessAreas.map((area, index) => (
                <li key={index} className="font-medium capitalize text-sm">{area}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin lugares de acceso especificados</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/(company)/visitors")({ component: VisitorsPage });

function VisitorsPage() {
  const [data, setData] = useState<Visitor[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detailsVisitor, setDetailsVisitor] = useState<Visitor | null>(null);
  const [accessAreasVisitor, setAccessAreasVisitor] = useState<Visitor | null>(null);
  const [accessAreasDialogOpen, setAccessAreasDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function fetchList() {
    setIsLoading(true);
    try {
      const orgId = getOrgId();
      const response = await API.getVisitors({
        status: status as VisitorStatus | "all",
        q: debouncedSearchTerm.trim() || undefined,
        page,
        pageSize,
        organizationId: orgId,
      });

      const rows = extractListData<ApiVisitor>(response).map((r: any) => ({
        id: r.id,
        name: r.name,
        accessAreas: Array.isArray(r.access_areas)
          ? r.access_areas
          : (Array.isArray(r.accessAreas) ? r.accessAreas : (r.accessAreas ? [r.accessAreas] : [])),
        entryDate: r.entry_date ?? r.entryDate,
        exitDate: r.exit_date ?? r.exitDate,
        status: r.status,
        approvedByUserId: r.approved_by_user_id ?? r.approvedByUserId,
        approvedAt: r.approved_at ?? r.approvedAt,
      })) as Visitor[];

      setData(rows);

      // Handle pagination metadata
      if (response.pagination) {
        const total = response.pagination.total ?? rows.length;
        const pageSizeValue = response.pagination.pageSize ?? pageSize;
        setPagination({
          page: response.pagination.page ?? page,
          pageSize: pageSizeValue,
          total,
          totalPages: response.pagination.totalPages ?? Math.ceil(total / pageSizeValue),
        });
      } else if (response.meta) {
        const total = response.meta.total ?? rows.length;
        const pageSizeValue = response.meta.pageSize ?? pageSize;
        setPagination({
          page: response.meta.page ?? page,
          pageSize: pageSizeValue,
          total,
          totalPages: response.meta.totalPages ?? Math.ceil(total / pageSizeValue),
        });
      } else {
        setPagination(null);
      }
    } catch (e: any) {
      toast.error(e.message || "No se pudo cargar la lista");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, [status, debouncedSearchTerm, page]);

  // Reset page when status changes
  useEffect(() => {
    setPage(1);
  }, [status]);

  async function approve(id: string) {
    try {
      const orgId = getOrgId();
      await API.approveVisitor(id, orgId);
      toast.success("Visitante aprobado");
      await fetchList();
    } catch (error: any) {
      toast.error(error.message || "Error al aprobar");
    }
  }

  async function rejectV(id: string) {
    try {
      const orgId = getOrgId();
      await API.rejectVisitor(id, orgId);
      toast.success("Visitante rechazado");
      await fetchList();
    } catch (error: any) {
      toast.error(error.message || "Error al rechazar");
    }
  }

  async function cancelV(id: string) {
    try {
      const orgId = getOrgId();
      await API.cancelVisitor(id, orgId);
      toast.success("Visitante cancelado");
      await fetchList();
    } catch (error: any) {
      toast.error(error.message || "Error al cancelar");
    }
  }

  const handleViewDetails = (visitor: Visitor) => {
    setDetailsVisitor(visitor);
  };

  const handleViewAccessAreas = (visitor: Visitor) => {
    setAccessAreasVisitor(visitor);
    setAccessAreasDialogOpen(true);
  };

  const columns = createColumns({
    onView: handleViewDetails,
    onViewAccessAreas: handleViewAccessAreas,
    onApprove: approve,
    onReject: rejectV,
    onCancel: cancelV,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    manualPagination: true,
    pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1,
  });

  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>Agregar visitante</CardTitle>
          <CardDescription>
            Registra un nuevo visitante con sus datos de acceso y fechas de entrada y salida.
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
              <Select value={status} onValueChange={setStatus}>
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
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Cargando visitantes...
            </div>
          ) : data.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {debouncedSearchTerm || status !== "all"
                ? "No se encontraron visitantes con los filtros aplicados."
                : "No hay visitantes registrados."}
            </div>
          ) : (
            <>
              <DataTableCard
                title=""
                table={table}
              />
              {pagination && pagination.total > pageSize && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} visitantes
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(pagination.total / pagination.pageSize) || isLoading}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateVisitorDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onComplete={fetchList}
      />

      <AccessAreasDialog
        visitor={accessAreasVisitor}
        open={accessAreasDialogOpen}
        onOpenChange={(open) => {
          setAccessAreasDialogOpen(open);
          if (!open) {
            setAccessAreasVisitor(null);
          }
        }}
      />

      {detailsVisitor && (
        <VisitorDetailsDialog
          visitor={detailsVisitor}
          open={Boolean(detailsVisitor)}
          onOpenChange={(open) => {
            if (!open) {
              setDetailsVisitor(null);
            }
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Visitor["status"] }) {
  const statusConfig = {
    pending: {
      label: "Pendiente",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
    },
    approved: {
      label: "Aprobado",
      className: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
    },
    rejected: {
      label: "Rechazado",
      className: "bg-red-100 text-red-800 border-red-200",
      icon: XCircle,
    },
    cancelled: {
      label: "Cancelado",
      className: "bg-gray-100 text-gray-800 border-gray-200",
      icon: Ban,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function ActionsCell({
  visitor,
  onView,
  onApprove,
  onReject,
  onCancel,
}: {
  visitor: Visitor;
  onView: (visitor: Visitor) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: Eye,
      action: () => onView(visitor),
    },
  ];

  if (visitor.status === "pending") {
    items.push(
      {
        label: "Aprobar",
        icon: CheckCircle,
        action: () => onApprove(visitor.id),
      },
      {
        label: "Rechazar",
        icon: XCircle,
        action: () => onReject(visitor.id),
        destructive: true,
      }
    );
  }

  if (visitor.status !== "cancelled") {
    items.push({
      label: "Cancelar",
      icon: Ban,
      action: () => onCancel(visitor.id),
      destructive: true,
    });
  }

  return <ActionMenu items={items} />;
}

type ColumnHandlers = {
  onView: (visitor: Visitor) => void;
  onViewAccessAreas: (visitor: Visitor) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
};

const createColumns = ({
  onView,
  onViewAccessAreas,
  onApprove,
  onReject,
  onCancel,
}: ColumnHandlers): ColumnDef<Visitor>[] => [
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
      cell: ({ row }) => row.original.name,
      enableSorting: true,
    },
    {
      header: "Estado",
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      header: ({ column }) => {
        return (
          <button
            className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Entrada</span>
            <ArrowUpDown className="h-4 w-4" />
          </button>
        );
      },
      accessorKey: "entryDate",
      cell: ({ row }) => {
        const date = new Date(row.original.entryDate);
        return (
          <span className="text-sm">
            {date.toLocaleString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      header: ({ column }) => {
        return (
          <button
            className="flex items-center space-x-2 hover:bg-gray-100 px-2 py-1 rounded"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <span>Salida</span>
            <ArrowUpDown className="h-4 w-4" />
          </button>
        );
      },
      accessorKey: "exitDate",
      cell: ({ row }) => {
        const date = new Date(row.original.exitDate);
        return (
          <span className="text-sm">
            {date.toLocaleString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      header: "Accesos",
      accessorKey: "accessAreas",
      cell: ({ row }) => {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewAccessAreas(row.original)}
            className="h-8 text-xs"
          >
            Ver accesos
          </Button>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <ActionsCell
            visitor={row.original}
            onView={onView}
            onApprove={onApprove}
            onReject={onReject}
            onCancel={onCancel}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

function VisitorDetailsDialog({
  visitor,
  open,
  onOpenChange,
}: {
  visitor: Visitor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const accessAreas = Array.isArray(visitor.accessAreas)
    ? visitor.accessAreas
    : (visitor.accessAreas ? [visitor.accessAreas] : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{visitor.name}</DialogTitle>
          <DialogDescription>
            Información detallada del visitante.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            <div className="mt-1">
              <StatusBadge status={visitor.status} />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha y hora de entrada</p>
            <p className="font-medium">
              {new Date(visitor.entryDate).toLocaleString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha y hora de salida</p>
            <p className="font-medium">
              {new Date(visitor.exitDate).toLocaleString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lugares de acceso</p>
            {accessAreas.length > 0 ? (
              <ul className="list-disc list-inside mt-1 space-y-1">
                {accessAreas.map((area, index) => (
                  <li key={index} className="font-medium capitalize">{area}</li>
                ))}
              </ul>
            ) : (
              <p className="font-medium text-muted-foreground">Sin especificar</p>
            )}
          </div>
          {visitor.approvedAt && (
            <div>
              <p className="text-sm text-muted-foreground">Aprobado el</p>
              <p className="font-medium">
                {new Date(visitor.approvedAt).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

