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
import { useForm } from "react-hook-form";
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
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Upload,
  Loader2,
  Download,
  X,
  RefreshCw,
} from "lucide-react";
import {
  useOrganizationStore,
  useOrganizationRole,
} from "@/store/organization-store";
import { useUserStore } from "@/store/user-store";
import API, {
  ApiPermission,
  ApiClientError,
  PermissionStatus,
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
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(company)/permissions")({
  component: PermissionsRoute,
});

interface Permission {
  id: string;
  userId: string;
  organizationId: string;
  message: string;
  documentsUrl: string[];
  startingDate: string;
  endDate: string;
  status: PermissionStatus;
  approvedBy: string | null;
  supervisorComment: string | null;
  createdAt: string;
  updatedAt: string;
}

function fromApiPermission(p: ApiPermission): Permission {
  return {
    id: p.id,
    userId: p.userId,
    organizationId: p.organizationId,
    message: p.message,
    documentsUrl: p.documentsUrl,
    startingDate: p.startingDate,
    endDate: p.endDate,
    status: p.status,
    approvedBy: p.approvedBy,
    supervisorComment: p.supervisorComment,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function isUnauthorizedError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.status === 401 || error.status === 403)
  );
}

const PERMISSIONS_QUERY_KEY = ["permissions"] as const;
const PERMISSIONS_FETCH_PAGE_SIZE = 100;

async function fetchPermissionsFromApi(params?: {
  status?: PermissionStatus;
  userId?: string;
}) {
  const results: Permission[] = [];
  let currentPage = 1;

  while (true) {
    const response = await API.getPermissions({
      status: params?.status,
      userId: params?.userId,
      page: currentPage,
      pageSize: PERMISSIONS_FETCH_PAGE_SIZE,
    });

    const pagePermissions = extractListData<ApiPermission>(response).map(
      fromApiPermission,
    );
    results.push(...pagePermissions);

    const pagination = response?.pagination;
    const totalPages = pagination?.totalPages;
    const shouldFetchNext =
      (totalPages && currentPage < totalPages) ||
      (!totalPages &&
        pagePermissions.length === PERMISSIONS_FETCH_PAGE_SIZE);

    if (!shouldFetchNext) {
      break;
    }

    currentPage += 1;
  }

  return results;
}

async function fetchPermissionById(id: string) {
  const response = await API.getPermission(id);
  if (!response?.data) {
    throw new Error("No se pudo obtener el permiso solicitado");
  }
  return fromApiPermission(response.data);
}

export function usePermissions(options?: {
  status?: PermissionStatus;
  userId?: string;
  enabled?: boolean;
}) {
  const status = options?.status;
  const userId = options?.userId;
  return useQuery({
    queryKey: [...PERMISSIONS_QUERY_KEY, status, userId] satisfies QueryKey,
    queryFn: () =>
      fetchPermissionsFromApi({
        status,
        userId,
      }),
    enabled: options?.enabled ?? true,
  });
}

export function usePermission(id: string | null) {
  return useQuery({
    queryKey: ["permission", id],
    queryFn: () => fetchPermissionById(id as string),
    enabled: !!id,
  });
}

export function useApprovePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      API.approvePermission(id, comment),
    onSuccess: async () => {
      toast.success("Permiso aprobado");
      await queryClient.invalidateQueries({
        queryKey: PERMISSIONS_QUERY_KEY,
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
          : "No se pudo aprobar el permiso",
      );
    },
  });
}

export function useRejectPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      API.rejectPermission(id, comment),
    onSuccess: async () => {
      toast.success("Permiso rechazado");
      await queryClient.invalidateQueries({
        queryKey: PERMISSIONS_QUERY_KEY,
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
          : "No se pudo rechazar el permiso",
      );
    },
  });
}

export function useAddPermissionDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      API.addPermissionDocuments(id, files),
    onSuccess: async () => {
      toast.success("Documentos agregados");
      await queryClient.invalidateQueries({
        queryKey: PERMISSIONS_QUERY_KEY,
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
          : "No se pudieron agregar los documentos",
      );
    },
  });
}

const STATUS_FILTER_OPTIONS: Array<{
  label: string;
  value: PermissionStatus | "all";
}> = [
  { label: "Todos los estados", value: "all" },
  { label: "Pendiente", value: "pending" },
  { label: "Aprobado", value: "approved" },
  { label: "Rechazado", value: "rejected" },
];

const PAGE_SIZE = 20;

const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

const SelectBase = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
SelectBase.displayName = "SelectBase";

const StatusSelect = SelectBase;

type UserInfo = {
  id: string;
  name: string;
  email: string;
};

function StatusBadge({ status }: { status: PermissionStatus }) {
  const statusMap: Record<
    PermissionStatus,
    { label: string; className: string; icon: typeof Clock }
  > = {
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
  };

  const config = statusMap[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function PermissionsRoute() {
  const { organization } = useOrganizationStore();
  const { user } = useUserStore();
  const role = useOrganizationRole();
  const canManagePermissions = role !== "member";
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PermissionStatus | "all">(
    "all",
  );
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [usersMap, setUsersMap] = useState<Map<string, UserInfo>>(new Map());
  const [usersList, setUsersList] = useState<UserInfo[]>([]);

  const [viewPermission, setViewPermission] = useState<Permission | null>(null);
  const [approvePermission, setApprovePermission] =
    useState<Permission | null>(null);
  const [rejectPermission, setRejectPermission] =
    useState<Permission | null>(null);
  const [addDocumentsPermission, setAddDocumentsPermission] =
    useState<Permission | null>(null);

  const handleViewDetails = useCallback((permission: Permission) => {
    setViewPermission(permission);
  }, []);

  const handleApprove = useCallback((permission: Permission) => {
    setApprovePermission(permission);
  }, []);

  const handleReject = useCallback((permission: Permission) => {
    setRejectPermission(permission);
  }, []);

  const handleAddDocuments = useCallback((permission: Permission) => {
    setAddDocumentsPermission(permission);
  }, []);

  // Fetch users for filtering
  useEffect(() => {
    async function fetchUsers() {
      if (!organization?.id || !canManagePermissions) {
        return;
      }

      try {
        const membersResult = await authClient.organization.listMembers();
        const members = membersResult.data?.members || [];

        const userMap = new Map<string, UserInfo>();
        const userList: UserInfo[] = [];

        members.forEach((member: any) => {
          if (member.user?.id) {
            const userInfo: UserInfo = {
              id: member.user.id,
              name: member.user.name || member.user.email || "Unknown",
              email: member.user.email || "",
            };
            userMap.set(member.user.id, userInfo);
            userList.push(userInfo);
          }
        });

        setUsersMap(userMap);
        setUsersList(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }

    fetchUsers();
  }, [organization?.id, canManagePermissions]);

  // Determine which userId to use for filtering
  const filterUserId = useMemo(() => {
    if (canManagePermissions) {
      return selectedUserId;
    }
    // Regular members only see their own permissions
    return user?.id;
  }, [canManagePermissions, selectedUserId, user?.id]);

  const { data, isLoading, isFetching, refetch } = usePermissions({
    status: statusFilter === "all" ? undefined : statusFilter,
    userId: filterUserId,
    enabled: !!organization?.id,
  });

  const approveMutation = useApprovePermission();
  const rejectMutation = useRejectPermission();
  const addDocumentsMutation = useAddPermissionDocuments();

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, selectedUserId]);

  const filteredPermissions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return (data || []).filter((permission) => {
      const matchesSearch = normalizedSearch
        ? permission.message.toLowerCase().includes(normalizedSearch)
        : true;

      return matchesSearch;
    });
  }, [data, searchTerm]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredPermissions.length / PAGE_SIZE),
  );

  const paginatedPermissions = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredPermissions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPermissions, page]);

  const formatDateRange = (startDate: string, endDate: string) => {
    try {
      const start = format(new Date(startDate), "dd/MM/yyyy");
      const end = format(new Date(endDate), "dd/MM/yyyy");
      return `${start} - ${end}`;
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  const formatDateTime = (value: string) => {
    try {
      return format(new Date(value), "dd/MM/yyyy HH:mm");
    } catch {
      return value;
    }
  };

  const columns = useMemo<ColumnDef<Permission>[]>(() => {
    return [
      {
        accessorKey: "userId",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Usuario
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        ),
        cell: ({ row }) => {
          const userInfo = usersMap.get(row.original.userId);
          if (userInfo) {
            return (
              <div className="space-y-1">
                <p className="font-medium">{userInfo.name}</p>
                <p className="text-xs text-muted-foreground">{userInfo.email}</p>
              </div>
            );
          }
          return <span className="text-muted-foreground">{row.original.userId}</span>;
        },
      },
      {
        accessorKey: "message",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Motivo
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        ),
        cell: ({ row }) => (
          <p className="max-w-md truncate text-sm">{row.original.message}</p>
        ),
      },
      {
        accessorKey: "startingDate",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-2 text-left text-sm font-medium"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Período
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        ),
        cell: ({ row }) => (
          <p className="text-sm">
            {formatDateRange(row.original.startingDate, row.original.endDate)}
          </p>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ver detalles"
              onClick={() => handleViewDetails(row.original)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canManagePermissions && row.original.status === "pending" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Aprobar"
                  onClick={() => handleApprove(row.original)}
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Rechazar"
                  onClick={() => handleReject(row.original)}
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Agregar documentos"
                  onClick={() => handleAddDocuments(row.original)}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ];
  }, [handleViewDetails, handleApprove, handleReject, handleAddDocuments, canManagePermissions, usersMap]);

  const table = useReactTable({
    data: paginatedPermissions,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: false,
  });

  const isSubmittingForm =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    addDocumentsMutation.isPending;

  const totalCount = filteredPermissions.length;

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
    ? "Cargando permisos..."
    : hasResults
      ? `Mostrando ${startRange}-${endRange} de ${totalCount} permisos`
      : "No hay permisos que coincidan con los filtros seleccionados.";

  return (
    <div className="space-y-6 p-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Permisos
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Gestiona las solicitudes de permisos y vacaciones de tu equipo.
            {canManagePermissions
              ? " Aproba o rechaza solicitudes pendientes."
              : " Visualiza tus solicitudes de permiso."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle>Filtros</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ajusta búsqueda y estado para encontrar permisos específicos.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="permission-search">Buscar</FieldLabel>
              <FieldContent>
                <Input
                  id="permission-search"
                  placeholder="Motivo o mensaje"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="permission-status">Estado</FieldLabel>
              <FieldContent>
                <StatusSelect
                  id="permission-status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as PermissionStatus | "all",
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
            {canManagePermissions && (
              <Field>
                <FieldLabel htmlFor="permission-user">Usuario</FieldLabel>
                <FieldContent>
                  <StatusSelect
                    id="permission-user"
                    value={selectedUserId || "all"}
                    onChange={(event) =>
                      setSelectedUserId(
                        event.target.value === "all"
                          ? undefined
                          : event.target.value,
                      )
                    }
                  >
                    <option value="all">Todos los usuarios</option>
                    {usersList.map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </StatusSelect>
                </FieldContent>
              </Field>
            )}
          </div>
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
          title="Listado de permisos"
          table={table}
          selectedCount={0}
          bulkActionLabel=""
          bulkActions={[]}
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

      <PermissionViewDialog
        permission={viewPermission}
        open={!!viewPermission}
        onOpenChange={(open) => {
          if (!open) {
            setViewPermission(null);
          }
        }}
        usersMap={usersMap}
      />

      <ApprovePermissionDialog
        permission={approvePermission}
        open={!!approvePermission}
        onOpenChange={(open) => {
          if (!open) {
            setApprovePermission(null);
          }
        }}
        onApprove={async (comment) => {
          if (!approvePermission) return;
          try {
            await approveMutation.mutateAsync({
              id: approvePermission.id,
              comment,
            });
            setApprovePermission(null);
          } catch (error) {
            console.error(error);
          }
        }}
        isSubmitting={approveMutation.isPending}
      />

      <RejectPermissionDialog
        permission={rejectPermission}
        open={!!rejectPermission}
        onOpenChange={(open) => {
          if (!open) {
            setRejectPermission(null);
          }
        }}
        onReject={async (comment) => {
          if (!rejectPermission) return;
          try {
            await rejectMutation.mutateAsync({
              id: rejectPermission.id,
              comment,
            });
            setRejectPermission(null);
          } catch (error) {
            console.error(error);
          }
        }}
        isSubmitting={rejectMutation.isPending}
      />

      <AddDocumentsDialog
        permission={addDocumentsPermission}
        open={!!addDocumentsPermission}
        onOpenChange={(open) => {
          if (!open) {
            setAddDocumentsPermission(null);
          }
        }}
        onAddDocuments={async (files) => {
          if (!addDocumentsPermission) return;
          try {
            await addDocumentsMutation.mutateAsync({
              id: addDocumentsPermission.id,
              files,
            });
            setAddDocumentsPermission(null);
          } catch (error) {
            console.error(error);
          }
        }}
        isSubmitting={addDocumentsMutation.isPending}
      />
    </div>
  );
}

interface PermissionViewDialogProps {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usersMap: Map<string, UserInfo>;
}

function PermissionViewDialog({
  permission,
  open,
  onOpenChange,
  usersMap,
}: PermissionViewDialogProps) {
  if (!permission) {
    return null;
  }

  const userInfo = usersMap.get(permission.userId);
  const formatDateTime = (value: string) => {
    try {
      return format(new Date(value), "dd/MM/yyyy HH:mm");
    } catch {
      return value;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    try {
      const start = format(new Date(startDate), "dd/MM/yyyy");
      const end = format(new Date(endDate), "dd/MM/yyyy");
      return `${start} - ${end}`;
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles del permiso</DialogTitle>
          <DialogDescription>
            Información completa de la solicitud de permiso
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Usuario</p>
              {userInfo ? (
                <div>
                  <p className="font-medium">{userInfo.name}</p>
                  <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                </div>
              ) : (
                <p className="font-medium">{permission.userId}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estado</p>
              <StatusBadge status={permission.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Período</p>
              <p className="font-medium">
                {formatDateRange(permission.startingDate, permission.endDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Solicitado</p>
              <p className="font-medium">{formatDateTime(permission.createdAt)}</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground mb-1">Motivo</p>
            <p className="leading-relaxed">{permission.message}</p>
          </div>
          {permission.documentsUrl && permission.documentsUrl.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Documentos</p>
              <div className="space-y-2">
                {permission.documentsUrl.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    <FileText className="h-4 w-4" />
                    Documento {index + 1}
                    <Download className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {permission.supervisorComment && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Comentario del supervisor
              </p>
              <p className="leading-relaxed bg-gray-50 p-2 rounded">
                {permission.supervisorComment}
              </p>
            </div>
          )}
          {permission.approvedBy && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Aprobado por</p>
              <p className="font-medium">{permission.approvedBy}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ApprovePermissionDialogProps {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (comment?: string) => Promise<void>;
  isSubmitting: boolean;
}

const approveFormSchema = z.object({
  comment: z.string().optional(),
});

type ApproveFormValues = z.infer<typeof approveFormSchema>;

function ApprovePermissionDialog({
  permission,
  open,
  onOpenChange,
  onApprove,
  isSubmitting,
}: ApprovePermissionDialogProps) {
  const form = useForm<ApproveFormValues>({
    resolver: zodResolver(approveFormSchema),
    defaultValues: {
      comment: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        comment: "",
      });
    }
  }, [open, form]);

  const handleSubmit = async (values: ApproveFormValues) => {
    await onApprove(values.comment || undefined);
  };

  if (!permission) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Aprobar permiso</DialogTitle>
          <DialogDescription>
            Confirma la aprobación de esta solicitud de permiso.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor="approve-comment">
              Comentario (opcional)
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="approve-comment"
                placeholder="Agregar un comentario opcional..."
                rows={3}
                {...form.register("comment")}
              />
            </FieldContent>
          </Field>

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
              {isSubmitting ? "Aprobando..." : "Aprobar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RejectPermissionDialogProps {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: (comment: string) => Promise<void>;
  isSubmitting: boolean;
}

const rejectFormSchema = z.object({
  comment: z.string().min(1, "El comentario es requerido"),
});

type RejectFormValues = z.infer<typeof rejectFormSchema>;

function RejectPermissionDialog({
  permission,
  open,
  onOpenChange,
  onReject,
  isSubmitting,
}: RejectPermissionDialogProps) {
  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
    defaultValues: {
      comment: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        comment: "",
      });
    }
  }, [open, form]);

  const handleSubmit = async (values: RejectFormValues) => {
    await onReject(values.comment);
  };

  if (!permission) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Rechazar permiso</DialogTitle>
          <DialogDescription>
            Indica el motivo del rechazo de esta solicitud.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <Field>
            <FieldLabel htmlFor="reject-comment">
              Comentario <span className="text-red-600">*</span>
            </FieldLabel>
            <FieldContent>
              <Textarea
                id="reject-comment"
                placeholder="Explica el motivo del rechazo..."
                rows={4}
                aria-invalid={!!form.formState.errors.comment}
                {...form.register("comment")}
              />
              <FieldError errors={[form.formState.errors.comment]} />
            </FieldContent>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Rechazando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AddDocumentsDialogProps {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDocuments: (files: File[]) => Promise<void>;
  isSubmitting: boolean;
}

function AddDocumentsDialog({
  permission,
  open,
  onOpenChange,
  onAddDocuments,
  isSubmitting,
}: AddDocumentsDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    if (open) {
      setSelectedFiles([]);
      setFileInputKey((prev) => prev + 1);
    }
  }, [open]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        toast.error(
          `${file.name}: Tipo de archivo no válido. Solo se permiten PDF, JPEG y PNG.`,
        );
        return false;
      }

      if (file.size > maxSize) {
        toast.error(
          `${file.name}: El archivo es demasiado grande. Máximo 10MB.`,
        );
        return false;
      }

      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error("Selecciona al menos un archivo");
      return;
    }

    await onAddDocuments(selectedFiles);
  };

  if (!permission) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Agregar documentos</DialogTitle>
          <DialogDescription>
            Sube documentos adicionales para esta solicitud de permiso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="documents">Documentos</FieldLabel>
            <FieldContent>
              <Input
                id="documents"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                key={fileInputKey}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos permitidos: PDF, JPEG, PNG. Máximo 10MB por archivo.
              </p>
            </FieldContent>
          </Field>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Archivos seleccionados:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedFiles.length === 0}>
              {isSubmitting ? "Subiendo..." : "Agregar documentos"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

