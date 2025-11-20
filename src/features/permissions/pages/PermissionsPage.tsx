import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/ui/data-table-card";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useOrganizationRole, useOrganizationStore } from "@/store/organization-store";
import { useUserStore } from "@/store/user-store";
import type { PermissionStatus } from "@/api";
import {
  useAddPermissionDocuments,
  useApprovePermission,
  usePermissions,
  useRejectPermission,
} from "../hooks/usePermissions";
import type { Permission } from "../types";
import { createPermissionColumns } from "../components/PermissionTableColumns";
import { PermissionsFilters } from "../components/PermissionsFilters";
import { PermissionViewDialog } from "../components/PermissionViewDialog";
import { ApprovePermissionDialog } from "../components/ApprovePermissionDialog";
import { RejectPermissionDialog } from "../components/RejectPermissionDialog";
import { AddDocumentsDialog } from "../components/AddDocumentsDialog";
import { UserInfo } from "../utils";

const PAGE_SIZE = 20;

export function PermissionsPage() {
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
  const [usersMap, setUsersMap] = useState<Map<string, UserInfo>>(new Map());
  const [usersList, setUsersList] = useState<UserInfo[]>([]);

  const [viewPermission, setViewPermission] = useState<Permission | null>(null);
  const [approvePermission, setApprovePermission] =
    useState<Permission | null>(null);
  const [rejectPermission, setRejectPermission] =
    useState<Permission | null>(null);
  const [addDocumentsPermission, setAddDocumentsPermission] =
    useState<Permission | null>(null);

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

    void fetchUsers();
  }, [organization?.id, canManagePermissions]);

  const filterUserId = useMemo(() => {
    if (canManagePermissions) {
      return selectedUserId;
    }
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

  const columns = useMemo(
    () =>
      createPermissionColumns({
        usersMap,
        onView: setViewPermission,
        onApprove: setApprovePermission,
        onReject: setRejectPermission,
        onAddDocuments: setAddDocumentsPermission,
      }),
    [usersMap],
  );

  const table = useReactTable({
    data: paginatedPermissions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
  });

  const totalCount = filteredPermissions.length;
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

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pageCount || nextPage === page) {
      return;
    }
    setPage(nextPage);
  };

  return (
    <div className="space-y-6 p-6 pb-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Permisos</h1>
        <p className="text-muted-foreground max-w-2xl">
          Revisa y administra las solicitudes de permiso enviadas por tu equipo.
        </p>
      </div>

      <div className="space-y-4">
        <DataTableToolbar
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "Buscar por motivo o mensaje",
          }}
          refresh={{ onClick: () => void refetch(), isRefreshing: isLoading }}
        >
          <PermissionsFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            canManagePermissions={canManagePermissions}
            selectedUserId={selectedUserId}
            onUserChange={setSelectedUserId}
            users={usersList}
          />
        </DataTableToolbar>
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
