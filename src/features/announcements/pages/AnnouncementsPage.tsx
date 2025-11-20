import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Edit,
  Eye,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTableCard } from "@/components/ui/data-table-card";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import {
  ColumnDef,
  SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { useOrganizationRole, useOrganizationStore } from "@/store/organization-store";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from "../hooks/useAnnouncements";
import { ActionMenu } from "@/components/ui/action-menu";
import type {
  Announcement,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementWithStatus,
} from "../types";
import { computeAnnouncementStatus } from "../types";
import { AnnouncementsFilters } from "../components/AnnouncementsFilters";
import { AnnouncementFormDialog } from "../components/AnnouncementFormDialog";
import { AnnouncementFormValues } from "../schema";
import { AnnouncementViewDialog } from "../components/AnnouncementViewDialog";
import { DeleteAnnouncementDialog } from "../components/DeleteAnnouncementDialog";
import { PriorityBadge, StatusBadge } from "../components/PriorityBadge";

const PAGE_SIZE = 20;

export function AnnouncementsPage() {
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

  const { data, isLoading, refetch } = useAnnouncements({
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
      status: computeAnnouncementStatus(
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
        cell: ({ row }) => {
          return (
            <div className="space-y-1">
              <p className="font-medium leading-tight">{row.original.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {row.original.content}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Prioridad",
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "published_at",
        header: "Publicado",
        cell: ({ row }) => new Date(row.original.published_at).toLocaleString(),
      },
      {
        accessorKey: "expires_at",
        header: "Expira",
        cell: ({ row }) =>
          row.original.expires_at
            ? new Date(row.original.expires_at).toLocaleString()
            : "Sin expiración",
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => {
          const announcement = row.original;
          return (
            <ActionMenu
              items={[
                {
                  label: "Ver detalles",
                  icon: Eye,
                  action: () => setViewAnnouncement(announcement),
                },
                {
                  label: "Editar",
                  icon: Edit,
                  action: () => {
                    setEditingAnnouncement(announcement);
                    setIsFormOpen(true);
                  },
                },
                {
                  label: "Eliminar",
                  icon: Trash2,
                  destructive: true,
                  action: () => setAnnouncementToDelete(announcement),
                },
              ]}
            />
          );
        },
      },
    ];
  }, []);

  const table = useReactTable({
    data: paginatedAnnouncements,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  const totalCount = filteredAnnouncements.length;

  const handleBulkDelete = async () => {
    const rows = table.getSelectedRowModel().rows;
    if (rows.length === 0) {
      toast.error("Selecciona al menos un anuncio");
      return;
    }

    if (
      !window.confirm(
        `¿Deseas eliminar ${rows.length} anuncio(s)? Esta acción no se puede deshacer.`,
      )
    ) {
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
    const payload = {
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
          <h1 className="text-3xl font-semibold tracking-tight">Anuncios</h1>
          <p className="text-muted-foreground max-w-2xl">
            Comunica novedades internas y mantén a tu equipo informado. Define
            prioridad, fechas de publicación y vigencia para cada mensaje.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAnnouncement(null);
            setIsFormOpen(true);
          }}
          disabled={!canManageAnnouncements || isLoading}
          variant={canManageAnnouncements ? "default" : "outline"}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo anuncio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTableToolbar
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Buscar por título o contenido",
            }}
            refresh={{ onClick: () => void refetch(), isRefreshing: isLoading }}
          >
            <AnnouncementsFilters
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              includeExpired={includeExpired}
              onIncludeExpiredChange={setIncludeExpired}
              includeFuture={includeFuture}
              onIncludeFutureChange={setIncludeFuture}
              canManageAnnouncements={canManageAnnouncements}
            />
          </DataTableToolbar>
          <p className="text-sm text-muted-foreground">{paginationLabel}</p>
          <DataTableCard
            title=""
            table={table}
            selectedCount={table.getSelectedRowModel().rows.length}
            bulkActionLabel="Acciones masivas"
            bulkActions={[
              {
                label: "Eliminar seleccionados",
                icon: Trash2,
                action: handleBulkDelete,
                destructive: true,
                disabled:
                  deleteMutation.isPending ||
                  table.getSelectedRowModel().rows.length === 0,
              },
            ]}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page === pageCount}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnnouncementFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingAnnouncement(null);
          }
        }}
        initialData={editingAnnouncement}
        onSubmit={handleSubmitAnnouncement}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <AnnouncementViewDialog
        announcement={viewAnnouncement}
        open={Boolean(viewAnnouncement)}
        onOpenChange={(open) => {
          if (!open) {
            setViewAnnouncement(null);
          }
        }}
      />

      <DeleteAnnouncementDialog
        open={Boolean(announcementToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setAnnouncementToDelete(null);
          }
        }}
        announcement={announcementToDelete}
        onConfirm={handleDeleteAnnouncement}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
