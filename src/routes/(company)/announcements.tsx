import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Loader2,
  PlusCircle,
} from "lucide-react";
import {
  useOrganizationStore,
  useOrganizationRole,
} from "@/store/organization-store";
import API, {
  AnnouncementPayload,
  ApiAnnouncement,
  ApiClientError,
  AnnouncementPriority as ApiAnnouncementPriority,
  extractListData,
} from "@/api";
import { DataTableCard } from "@/components/ui/data-table-card";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

export const Route = createFileRoute("/(company)/announcements")({
  component: AnnouncementsRoute,
});

type AnnouncementPriority = ApiAnnouncementPriority;

type AnnouncementStatus = "active" | "future" | "expired";

const PRIORITY_FILTER_OPTIONS: Array<{
  label: string;
  value: AnnouncementPriority | "all";
}> = [
  { label: "Todas las prioridades", value: "all" },
  { label: "Normal", value: "normal" },
  { label: "Importante", value: "important" },
  { label: "Urgente", value: "urgent" },
];

const STATUS_FILTER_OPTIONS: Array<{
  label: string;
  value: AnnouncementStatus | "all";
}> = [
  { label: "Todos los estados", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Futuros", value: "future" },
  { label: "Expirados", value: "expired" },
];

interface Announcement {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  published_at: string;
  expires_at: string | null;
  created_at: string;
}

function fromApiAnnouncement(a: ApiAnnouncement): Announcement {
  return {
    id: a.id,
    organization_id: a.organizationId ?? "",
    title: a.title,
    content: a.content,
    priority: a.priority,
    published_at: a.publishedAt,
    expires_at: a.expiresAt,
    created_at: a.createdAt,
  };
}

function isUnauthorizedError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.status === 401 || error.status === 403)
  );
}

const announcementsFormSchema = z
  .object({
    title: z.string().min(1, "El título es requerido"),
    content: z.string().min(1, "El contenido es requerido"),
    priority: z.enum(["normal", "important", "urgent"]),
    published_at: z.date({
      required_error: "La fecha de publicación es obligatoria",
      invalid_type_error: "La fecha de publicación es inválida",
    }),
    expires_at: z
      .date({
        invalid_type_error: "La fecha de expiración es inválida",
      })
      .nullable()
      .optional(),
  })
  .refine(
    (values) => {
      if (!values.expires_at) return true;
      if (!values.published_at) return false;
      return values.expires_at > values.published_at;
    },
    {
      path: ["expires_at"],
      message: "La fecha de expiración debe ser posterior a la publicación",
    },
  );

type AnnouncementFormValues = z.infer<typeof announcementsFormSchema>;

const ANNOUNCEMENTS_QUERY_KEY = ["announcements"] as const;
const ANNOUNCEMENTS_FETCH_PAGE_SIZE = 100;

async function fetchAnnouncementsFromApi(params?: {
  includeExpired?: boolean;
  includeFuture?: boolean;
}) {
  const results: Announcement[] = [];
  let currentPage = 1;

  while (true) {
    const response = await API.getAnnouncements({
      includeExpired: params?.includeExpired,
      includeFuture: params?.includeFuture,
      page: currentPage,
      pageSize: ANNOUNCEMENTS_FETCH_PAGE_SIZE,
    });

    const pageAnnouncements = extractListData<ApiAnnouncement>(response).map(
      fromApiAnnouncement,
    );
    results.push(...pageAnnouncements);

    const pagination = response?.pagination;
    const totalPages = pagination?.totalPages;
    const shouldFetchNext =
      (totalPages && currentPage < totalPages) ||
      (!totalPages &&
        pageAnnouncements.length === ANNOUNCEMENTS_FETCH_PAGE_SIZE);

    if (!shouldFetchNext) {
      break;
    }

    currentPage += 1;
  }

  return results;
}

async function fetchAnnouncementById(id: string) {
  const response = await API.getAnnouncement(id);
  if (!response?.data) {
    throw new Error("No se pudo obtener el anuncio solicitado");
  }
  return fromApiAnnouncement(response.data);
}

async function createAnnouncementRequest(payload: AnnouncementPayload) {
  const response = await API.createAnnouncement(payload);
  if (!response?.data) {
    throw new Error("No se pudo crear el anuncio");
  }
  return fromApiAnnouncement(response.data);
}

async function updateAnnouncementRequest(
  id: string,
  payload: AnnouncementPayload,
) {
  const response = await API.updateAnnouncement(id, payload);
  if (!response?.data) {
    throw new Error("No se pudo actualizar el anuncio");
  }
  return fromApiAnnouncement(response.data);
}

async function deleteAnnouncementRequest(id: string) {
  await API.deleteAnnouncement(id);
  return { id };
}

function computeStatus(
  publishedISO: string,
  expiresISO: string | null,
): AnnouncementStatus {
  const now = new Date();
  const published = new Date(publishedISO);
  const expires = expiresISO ? new Date(expiresISO) : null;

  if (published > now) {
    return "future";
  }

  if (expires && expires < now) {
    return "expired";
  }

  return "active";
}

export function useAnnouncements(options?: {
  includeExpired?: boolean;
  includeFuture?: boolean;
  enabled?: boolean;
}) {
  const includeExpired = options?.includeExpired ?? false;
  const includeFuture = options?.includeFuture ?? false;
  return useQuery({
    queryKey: [
      ...ANNOUNCEMENTS_QUERY_KEY,
      includeExpired,
      includeFuture,
    ] satisfies QueryKey,
    queryFn: () =>
      fetchAnnouncementsFromApi({
        includeExpired,
        includeFuture,
      }),
    enabled: options?.enabled ?? true,
  });
}

export function useAnnouncement(id: string | null) {
  return useQuery({
    queryKey: ["announcement", id],
    queryFn: () => fetchAnnouncementById(id as string),
    enabled: !!id,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) =>
      createAnnouncementRequest(payload),
    onSuccess: async () => {
      toast.success("Anuncio creado");
      await queryClient.invalidateQueries({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      if (isUnauthorizedError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo crear el anuncio",
      );
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; payload: AnnouncementPayload }) =>
      updateAnnouncementRequest(input.id, input.payload),
    onSuccess: async () => {
      toast.success("Anuncio actualizado");
      await queryClient.invalidateQueries({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      if (isUnauthorizedError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el anuncio",
      );
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncementRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
        exact: false,
      });

      const snapshots = queryClient.getQueriesData<Announcement[]>({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
      });

      snapshots.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(
          key,
          data.filter((announcement) => announcement.id !== id),
        );
      });

      return { snapshots };
    },
    onSuccess: () => {
      toast.success("Anuncio eliminado");
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (isUnauthorizedError(error)) {
        toast.error("No tienes permisos para realizar esta acción");
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el anuncio",
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ANNOUNCEMENTS_QUERY_KEY,
        exact: false,
      });
    },
  });
}

type AnnouncementWithStatus = Announcement & { status: AnnouncementStatus };

const PAGE_SIZE = 20;

const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn("placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

const SelectBase = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn("border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]", className)}
      {...props}
    >
      {children}
    </select>
  ),
);
SelectBase.displayName = "SelectBase";

const PrioritySelect = SelectBase;
const StatusSelect = SelectBase;

function AnnouncementsRoute() {
  const { organization } = useOrganizationStore();
  const role = useOrganizationRole();
  const canManageAnnouncements = role !== "member";
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] =
    useState<AnnouncementPriority | "all">("all");
  const [statusFilter, setStatusFilter] =
    useState<AnnouncementStatus | "all">("all");
  const [includeExpired, setIncludeExpired] = useState(false);
  const [includeFuture, setIncludeFuture] = useState(false);
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [viewAnnouncement, setViewAnnouncement] =
    useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<Announcement | null>(null);
  const handleViewDetails = useCallback((announcement: Announcement) => {
    setViewAnnouncement(announcement);
  }, []);
  const handlePromptDelete = useCallback(
    (announcement: Announcement) => {
      setAnnouncementToDelete(announcement);
    },
    [],
  );
  const handleOpenCreate = useCallback(() => {
    setEditingAnnouncement(null);
    setIsFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
  }, []);

  const { data, isLoading, isFetching } = useAnnouncements({
    includeExpired: canManageAnnouncements ? includeExpired : undefined,
    includeFuture: canManageAnnouncements ? includeFuture : undefined,
    enabled: !!organization?.id,
  });

  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const announcementsWithStatus = useMemo<AnnouncementWithStatus[]>(() => {
    if (!data?.length) return [];
    return data.map((announcement) => ({
      ...announcement,
      status: computeStatus(
        announcement.published_at,
        announcement.expires_at,
      ),
    }));
  }, [data]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, priorityFilter, statusFilter]);

  const filteredAnnouncements = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return announcementsWithStatus.filter((announcement) => {
      const matchesSearch = normalizedSearch
        ? announcement.title.toLowerCase().includes(normalizedSearch) ||
        announcement.content.toLowerCase().includes(normalizedSearch)
        : true;

      const matchesPriority =
        priorityFilter === "all" || announcement.priority === priorityFilter;

      const matchesStatus =
        statusFilter === "all" || announcement.status === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [announcementsWithStatus, searchTerm, priorityFilter, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredAnnouncements.length / PAGE_SIZE),
  );

  const paginatedAnnouncements = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredAnnouncements.slice(
      startIndex,
      startIndex + PAGE_SIZE,
    );
  }, [filteredAnnouncements, page]);

  const columns = useMemo<ColumnDef<AnnouncementWithStatus>[]>(() => {
    return [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Título
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-semibold leading-tight">{row.original.title}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {row.original.content}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "priority",
        header: "Prioridad",
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: false,
      },
      {
        accessorKey: "published_at",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Publicado
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        ),
        cell: ({ row }) => (
          <p className="text-sm font-medium">
            {formatDateTime(row.original.published_at)}
          </p>
        ),
      },
      {
        accessorKey: "expires_at",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Expira
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        ),
        cell: ({ row }) => (
          <p className="text-sm font-medium">
            {row.original.expires_at
              ? formatDateTime(row.original.expires_at)
              : "Sin expiración"}
          </p>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ver anuncio"
              onClick={() => handleViewDetails(row.original)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canManageAnnouncements && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar anuncio"
                  onClick={() => handleOpenEdit(row.original)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar anuncio"
                  onClick={() => handlePromptDelete(row.original)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ];
  }, [
    handleOpenEdit,
    handlePromptDelete,
    handleViewDetails,
    canManageAnnouncements,
  ]);

  const table = useReactTable({
    data: paginatedAnnouncements,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: canManageAnnouncements,
  });

  const selectedRowCount = canManageAnnouncements
    ? table.getSelectedRowModel().rows.length
    : 0;

  const isSubmittingForm =
    createMutation.isPending || updateMutation.isPending;

  const totalCount = filteredAnnouncements.length;

  const handleBulkDelete = async () => {
    if (!canManageAnnouncements) return;
    const rows = table.getSelectedRowModel().rows;
    if (!rows.length) return;

    const confirmation = window.confirm(
      rows.length === 1
        ? "¿Deseas eliminar el anuncio seleccionado?"
        : `¿Deseas eliminar ${rows.length} anuncios seleccionados?`,
    );

    if (!confirmation) {
      return;
    }

    const ids = rows.map((row) => row.original.id);
    table.resetRowSelection();

    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pageCount || nextPage === page) {
      return;
    }
    setPage(nextPage);
  };

  const hasResults = totalCount > 0;
  const startRange = hasResults ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endRange = hasResults
    ? Math.min(page * PAGE_SIZE, totalCount)
    : 0;
  const paginationLabel = isLoading
    ? "Cargando anuncios..."
    : hasResults
      ? `Mostrando ${startRange}-${endRange} de ${totalCount} anuncios`
      : "No hay anuncios que coincidan con los filtros seleccionados.";

  const handleSubmitAnnouncement = async (values: AnnouncementFormValues) => {
    const payload: AnnouncementPayload = {
      title: values.title,
      content: values.content,
      priority: values.priority,
      published_at: values.published_at.toISOString(),
      expires_at: values.expires_at ? values.expires_at.toISOString() : null,
    };

    try {
      if (editingAnnouncement) {
        await updateMutation.mutateAsync({
          id: editingAnnouncement.id,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      setIsFormOpen(false);
      setEditingAnnouncement(null);
    } catch (error) {
      // Los errores ya se notifican vía toast; mantenemos el modal abierto.
      console.error(error);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    try {
      await deleteMutation.mutateAsync(announcementToDelete.id);
      setAnnouncementToDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 p-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Anuncios
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Comunica novedades internas y mantén a tu equipo informado. Define
            prioridad, fechas de publicación y vigencia para cada mensaje.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          disabled={!canManageAnnouncements || isLoading}
          variant={canManageAnnouncements ? "default" : "outline"}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo anuncio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle>Filtros</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ajusta búsqueda, prioridad y estado para encontrar anuncios
              específicos.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="announcement-search">Buscar</FieldLabel>
              <FieldContent>
                <Input
                  id="announcement-search"
                  placeholder="Título o contenido"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="announcement-priority">
                Prioridad
              </FieldLabel>
              <FieldContent>
                <PrioritySelect
                  id="announcement-priority"
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(
                      event.target.value as AnnouncementPriority | "all",
                    )
                  }
                >
                  {PRIORITY_FILTER_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </PrioritySelect>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="announcement-status">Estado</FieldLabel>
              <FieldContent>
                <StatusSelect
                  id="announcement-status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as AnnouncementStatus | "all",
                    )
                  }
                >
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </StatusSelect>
              </FieldContent>
            </Field>
          </div>

          {canManageAnnouncements && (
            <div className="flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="include-expired"
                  checked={includeExpired}
                  onCheckedChange={(checked) =>
                    setIncludeExpired(Boolean(checked))
                  }
                />
                <label
                  htmlFor="include-expired"
                  className="text-sm font-medium leading-none"
                >
                  Incluir expirados
                  <p className="text-xs font-normal text-muted-foreground">
                    Solo visible para administradores
                  </p>
                </label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="include-future"
                  checked={includeFuture}
                  onCheckedChange={(checked) =>
                    setIncludeFuture(Boolean(checked))
                  }
                />
                <label
                  htmlFor="include-future"
                  className="text-sm font-medium leading-none"
                >
                  Incluir programados
                  <p className="text-xs font-normal text-muted-foreground">
                    Muestra anuncios planificados aún no publicados
                  </p>
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {paginationLabel}
          </span>
          <div className="flex items-center gap-3">
            {isFetching && !isLoading && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Actualizando
              </span>
            )}
          </div>
        </div>
        <DataTableCard
          title="Listado de anuncios"
          table={table}
          selectedCount={selectedRowCount}
          bulkActionLabel="Eliminar seleccionados"
          bulkActions={
            canManageAnnouncements
              ? [
                  {
                    label: "Eliminar seleccionados",
                    icon: Trash2,
                    action: handleBulkDelete,
                    destructive: true,
                  },
                ]
              : []
          }
        />
        {pageCount > 1 && (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span>{paginationLabel}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1 || isLoading}
              >
                Anterior
              </Button>
              <span>
                Página {page} de {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page === pageCount || isLoading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <AnnouncementDialogForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingAnnouncement(null);
          }
        }}
        initialData={editingAnnouncement}
        onSubmit={handleSubmitAnnouncement}
        isSubmitting={isSubmittingForm}
      />

      <AnnouncementViewDialog
        announcement={viewAnnouncement}
        open={!!viewAnnouncement}
        onOpenChange={(open) => {
          if (!open) {
            setViewAnnouncement(null);
          }
        }}
      />

      <DeleteAnnouncementDialog
        open={!!announcementToDelete}
        announcement={announcementToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setAnnouncementToDelete(null);
          }
        }}
        onConfirm={handleDeleteAnnouncement}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}


interface AnnouncementDialogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Announcement | null;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
  isSubmitting: boolean;
}

function AnnouncementDialogForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: AnnouncementDialogFormProps) {
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementsFormSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "normal",
      published_at: new Date(),
      expires_at: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: initialData?.title ?? "",
        content: initialData?.content ?? "",
        priority: initialData?.priority ?? "normal",
        published_at: initialData
          ? new Date(initialData.published_at)
          : new Date(),
        expires_at: initialData?.expires_at
          ? new Date(initialData.expires_at)
          : null,
      });
    }
  }, [initialData, open, form]);

  const handleSubmit = async (values: AnnouncementFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar anuncio" : "Nuevo anuncio"}
          </DialogTitle>
          <DialogDescription>
            Completa la información para {initialData ? "actualizar" : "crear"}{" "}
            el anuncio.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor="announcement-title">Título</FieldLabel>
            <FieldContent>
              <Input
                id="announcement-title"
                placeholder="Ej. Mantenimiento programado"
                aria-invalid={!!form.formState.errors.title}
                {...form.register("title")}
              />
              <FieldError errors={[form.formState.errors.title]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="announcement-content">
              Contenido
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="announcement-content"
                placeholder="Describe los detalles importantes..."
                rows={4}
                aria-invalid={!!form.formState.errors.content}
                {...form.register("content")}
              />
              <FieldError errors={[form.formState.errors.content]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="announcement-priority-select">
              Prioridad
            </FieldLabel>
            <FieldContent>
              <PrioritySelect
                id="announcement-priority-select"
                aria-invalid={!!form.formState.errors.priority}
                {...form.register("priority")}
              >
                <option value="normal">Normal</option>
                <option value="important">Importante</option>
                <option value="urgent">Urgente</option>
              </PrioritySelect>
              <FieldError errors={[form.formState.errors.priority]} />
            </FieldContent>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Fecha de publicación</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="published_at"
                  render={({ field }) => (
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocal(field.value)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            ? new Date(event.target.value)
                            : new Date(),
                        )
                      }
                    />
                  )}
                />
                <FieldError errors={[form.formState.errors.published_at]} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Fecha de expiración</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="expires_at"
                  render={({ field }) => (
                    <Input
                      type="datetime-local"
                      value={field.value ? toDateTimeLocal(field.value) : ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value
                            ? new Date(event.target.value)
                            : null,
                        )
                      }
                    />
                  )}
                />
                <FieldError errors={[form.formState.errors.expires_at]} />
              </FieldContent>
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
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AnnouncementViewDialogProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AnnouncementViewDialog({
  announcement,
  open,
  onOpenChange,
}: AnnouncementViewDialogProps) {
  if (!announcement) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription>
            Publicado el {formatDateTime(announcement.published_at)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Prioridad</p>
            <PriorityBadge priority={announcement.priority} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Contenido</p>
            <p className="leading-relaxed">{announcement.content}</p>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Publicado</p>
              <p className="font-medium">
                {formatDateTime(announcement.published_at)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expira</p>
              <p className="font-medium">
                {announcement.expires_at
                  ? formatDateTime(announcement.expires_at)
                  : "Sin expiración"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteAnnouncementDialog({
  open,
  onOpenChange,
  announcement,
  onConfirm,
  isDeleting,
}: DeleteAnnouncementDialogProps) {
  if (!announcement) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Eliminar anuncio</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Confirma si deseas eliminar el
            anuncio "{announcement.title}".
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  const priorityMap: Record<AnnouncementPriority, string> = {
    normal: "bg-muted text-foreground border-transparent",
    important: "bg-amber-100 text-amber-800 border-amber-200",
    urgent: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <Badge className={priorityMap[priority]} variant="outline">
      {priority === "normal"
        ? "Normal"
        : priority === "important"
          ? "Importante"
          : "Urgente"}
    </Badge>
  );
}

function StatusBadge({ status }: { status: AnnouncementStatus }) {
  const statusMap: Record<
    AnnouncementStatus,
    { label: string; className: string }
  > = {
    active: {
      label: "Activo",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    future: {
      label: "Futuro",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
    expired: {
      label: "Expirado",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    },
  };

  return (
    <Badge variant="outline" className={statusMap[status].className}>
      {statusMap[status].label}
    </Badge>
  );
}

function toDateTimeLocal(value: Date | null | undefined) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(value: string) {
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}
