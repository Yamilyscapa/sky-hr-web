import {
  forwardRef,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Eye, Edit, Trash2, Loader2, PlusCircle } from "lucide-react";
import { useOrganizationStore, useIsOrgAdmin } from "@/store/organization-store";

export const Route = createFileRoute("/(company)/announcements")({
  component: AnnouncementsRoute,
});

type AnnouncementPriority = "normal" | "important" | "urgent";

type AnnouncementStatus = "active" | "future" | "expired";

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

interface ApiResponse<T> {
  message: string;
  data: T;
}

type AnnouncementPayload = {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  published_at: string;
  expires_at: string | null;
};

type ApiAnnouncement = {
  id: string;
  organizationId: string | null;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt?: string;
};

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

class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isUnauthorizedError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
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

const API_BASE = (import.meta.env?.VITE_API_URL as string | undefined) ?? "";

function buildUrl(path: string, params?: Record<string, string | undefined>) {
  const sanitizedBase = API_BASE?.replace(/\/$/, "") ?? "";
  const target = sanitizedBase ? `${sanitizedBase}${path}` : path;
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.set(key, value);
      }
    });
  }
  const queryString = searchParams.toString();
  return queryString ? `${target}?${queryString}` : target;
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Ignore JSON parse errors to fall back to generic message
  }

  if (!response.ok) {
    const message =
      payload?.message ?? "Ocurrió un error al comunicarse con el servidor";
    throw new ApiError(message, response.status);
  }

  if (!payload) {
    throw new Error("Respuesta inválida del servidor");
  }

  return payload.data;
}

async function listAnnouncements(params?: {
  includeExpired?: boolean;
  includeFuture?: boolean;
}) {
  const url = buildUrl("/announcements", {
    includeExpired: params?.includeExpired ? "true" : undefined,
    includeFuture: params?.includeFuture ? "true" : undefined,
  });
  const rows = await apiRequest<ApiAnnouncement[]>(url);
  return rows.map(fromApiAnnouncement);
}

async function getAnnouncement(id: string) {
  const url = buildUrl(`/announcements/${id}`);
  const row = await apiRequest<ApiAnnouncement>(url);
  return fromApiAnnouncement(row);
}

async function createAnnouncement(payload: AnnouncementPayload) {
  const url = buildUrl("/announcements");
  const row = await apiRequest<ApiAnnouncement>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return fromApiAnnouncement(row);
}

async function updateAnnouncement(
  id: string,
  payload: AnnouncementPayload,
) {
  const url = buildUrl(`/announcements/${id}`);
  const row = await apiRequest<ApiAnnouncement>(url, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return fromApiAnnouncement(row);
}

async function deleteAnnouncement(id: string) {
  const url = buildUrl(`/announcements/${id}`);
  return apiRequest<{ id: string }>(url, { method: "DELETE" });
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
      listAnnouncements({
        includeExpired,
        includeFuture,
      }),
    enabled: options?.enabled ?? true,
  });
}

export function useAnnouncement(id: string | null) {
  return useQuery({
    queryKey: ["announcement", id],
    queryFn: () => getAnnouncement(id as string),
    enabled: !!id,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) => createAnnouncement(payload),
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
      updateAnnouncement(input.id, input.payload),
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
    mutationFn: (id: string) => deleteAnnouncement(id),
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
  const isAdmin = useIsOrgAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] =
    useState<AnnouncementPriority | "all">("all");
  const [statusFilter, setStatusFilter] =
    useState<AnnouncementStatus | "all">("all");
  const [includeExpired, setIncludeExpired] = useState(false);
  const [includeFuture, setIncludeFuture] = useState(false);
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [viewAnnouncement, setViewAnnouncement] =
    useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<Announcement | null>(null);

  const { data, isLoading, isFetching } = useAnnouncements({
    includeExpired: isAdmin ? includeExpired : undefined,
    includeFuture: isAdmin ? includeFuture : undefined,
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

  const isSubmittingForm =
    createMutation.isPending || updateMutation.isPending;

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
  };

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
    <div className="container mx-auto space-y-8 py-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Anuncios</h1>
        <p className="text-muted-foreground max-w-2xl">
          Gestiona los anuncios internos de tu organización. Crea mensajes,
          define su prioridad y controla su vigencia.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl font-semibold">
            Historial de anuncios
          </CardTitle>
          {isAdmin && (
            <Button onClick={handleOpenCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo anuncio
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <AnnouncementsTable
            data={paginatedAnnouncements}
            isAdmin={isAdmin}
            isLoading={isLoading}
            isFetching={isFetching}
            search={searchTerm}
            onSearchChange={setSearchTerm}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            includeExpired={includeExpired}
            includeFuture={includeFuture}
            onIncludeExpiredChange={setIncludeExpired}
            onIncludeFutureChange={setIncludeFuture}
            showAdminToggles={isAdmin}
            onView={setViewAnnouncement}
            onEdit={handleOpenEdit}
            onDelete={setAnnouncementToDelete}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={filteredAnnouncements.length}
          />
        </CardContent>
      </Card>

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

interface AnnouncementsTableProps {
  data: AnnouncementWithStatus[];
  isAdmin: boolean;
  isLoading: boolean;
  isFetching: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  priorityFilter: AnnouncementPriority | "all";
  onPriorityChange: (value: AnnouncementPriority | "all") => void;
  statusFilter: AnnouncementStatus | "all";
  onStatusChange: (value: AnnouncementStatus | "all") => void;
  includeExpired: boolean;
  includeFuture: boolean;
  onIncludeExpiredChange: (value: boolean) => void;
  onIncludeFutureChange: (value: boolean) => void;
  showAdminToggles: boolean;
  onView: (announcement: Announcement) => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}

function AnnouncementsTable({
  data,
  isAdmin,
  isLoading,
  isFetching,
  search,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  statusFilter,
  onStatusChange,
  includeExpired,
  includeFuture,
  onIncludeExpiredChange,
  onIncludeFutureChange,
  showAdminToggles,
  onView,
  onEdit,
  onDelete,
  page,
  pageCount,
  onPageChange,
  totalCount,
}: AnnouncementsTableProps) {
  const priorityOptions: Array<{
    label: string;
    value: AnnouncementPriority | "all";
  }> = [
    { label: "Todas las prioridades", value: "all" },
    { label: "Normal", value: "normal" },
    { label: "Importante", value: "important" },
    { label: "Urgente", value: "urgent" },
  ];

  const statusOptions: Array<{
    label: string;
    value: AnnouncementStatus | "all";
  }> = [
    { label: "Todos los estados", value: "all" },
    { label: "Activos", value: "active" },
    { label: "Futuros", value: "future" },
    { label: "Expirados", value: "expired" },
  ];

  const hasData = data.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="announcement-search">Buscar</FieldLabel>
          <FieldContent>
            <Input
              id="announcement-search"
              placeholder="Buscar por título o contenido"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
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
                onPriorityChange(event.target.value as AnnouncementPriority | "all")
              }
            >
              {priorityOptions.map((option) => (
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
                onStatusChange(event.target.value as AnnouncementStatus | "all")
              }
            >
              {statusOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </StatusSelect>
          </FieldContent>
        </Field>
        {showAdminToggles && (
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-expired"
                checked={includeExpired}
                onCheckedChange={(checked) =>
                  onIncludeExpiredChange(Boolean(checked))
                }
                aria-label="Mostrar anuncios expirados"
              />
              <label
                htmlFor="include-expired"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Incluir expirados
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-future"
                checked={includeFuture}
                onCheckedChange={(checked) =>
                  onIncludeFutureChange(Boolean(checked))
                }
                aria-label="Mostrar anuncios futuros"
              />
              <label
                htmlFor="include-future"
                className="text-sm font-medium leading-none"
              >
                Incluir futuros
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando anuncios...
          </div>
        ) : hasData ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Publicado</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {announcement.title}
                        </span>
                        <span className="text-muted-foreground text-sm line-clamp-2">
                          {announcement.content}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={announcement.priority} />
                    </TableCell>
                    <TableCell>
                      {formatDateTime(announcement.published_at)}
                    </TableCell>
                    <TableCell>
                      {announcement.expires_at
                        ? formatDateTime(announcement.expires_at)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={announcement.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ver anuncio"
                          onClick={() => onView(announcement)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Editar anuncio"
                              onClick={() => onEdit(announcement)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Eliminar anuncio"
                              onClick={() => onDelete(announcement)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              No hay anuncios que coincidan con los filtros seleccionados.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isFetching && (
            <span className="mr-2 inline-flex items-center">
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Actualizando
            </span>
          )}
          Mostrando {data.length ? data.length : 0} de {totalCount} anuncios
        </div>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span>
              Página {page} de {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(pageCount, page + 1))}
              disabled={page === pageCount}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
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
