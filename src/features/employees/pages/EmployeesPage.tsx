import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DataTableCard } from "@/components/ui/data-table-card";
import { type ActionMenuItem } from "@/components/ui/action-menu";
import { useReactTable, getCoreRowModel, getSortedRowModel } from "@tanstack/react-table";
import { Copy, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useUserStore } from "@/store/user-store";
import { useOrganizationStore } from "@/store/organization-store";
import type {
  Employee,
  Geofence,
  PendingInvitation,
  Shift,
} from "../types";
import {
  assignGeofences,
  assignShift,
  fetchGeofences,
  fetchShifts,
  fetchUserGeofences,
  fetchUserSchedules,
  removeGeofence,
} from "../data";
import { PendingInvitationsPanel } from "../components/PendingInvitationsPanel";
import { EmployeeDetailsDialog } from "../components/EmployeeDetailsDialog";
import { ManageEmployeeDialog } from "../components/ManageEmployeeDialog";
import { createEmployeeColumns } from "../components/EmployeesTableColumns";

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null);
  const [manageEmployee, setManageEmployee] = useState<Employee | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [promotingMemberId, setPromotingMemberId] = useState<string | null>(null);
  const [demotingMemberId, setDemotingMemberId] = useState<string | null>(null);
  const { user } = useUserStore();
  const { organization } = useOrganizationStore();

  const handleAssignShift = async (
    employeeId: string,
    shiftId: string,
    effectiveFrom: string,
    effectiveUntil?: string,
  ) => {
    const effectiveFromISO = new Date(effectiveFrom).toISOString();
    const effectiveUntilISO = effectiveUntil
      ? new Date(effectiveUntil).toISOString()
      : undefined;

    const response = await assignShift({
      user_id: employeeId,
      shift_id: shiftId,
      effective_from: effectiveFromISO,
      effective_until: effectiveUntilISO,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    alert("Turno asignado exitosamente");
    await handleUsersList();
  };

  const handleAssignLocations = async (
    employeeId: string,
    geofenceIds: string[],
    assignAll?: boolean,
  ) => {
    const response = await assignGeofences({
      user_id: employeeId,
      geofence_ids: assignAll ? undefined : geofenceIds,
      assign_all: assignAll,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    alert("Ubicaciones asignadas exitosamente");
    await handleUsersList();
  };

  const handleRemoveLocation = async (employeeId: string, geofenceId: string) => {
    const response = await removeGeofence({
      user_id: employeeId,
      geofence_id: geofenceId,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    alert("Ubicación removida exitosamente");
    await handleUsersList();
  };

  const handleViewEmployeeDetails = (employee: Employee) => {
    setDetailsEmployee(employee);
  };

  const handleManageEmployee = (employee: Employee) => {
    if (employee.status === "pending") {
      alert("No puedes editar una invitación pendiente.");
      return;
    }
    setManageEmployee(employee);
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!employee.id && !employee.email) {
      alert("No se encontró el identificador del empleado.");
      return;
    }

    if (employee.role === "owner") {
      alert("No puedes eliminar al propietario de la organización.");
      return;
    }

    if (!window.confirm(`¿Deseas eliminar a ${employee.name || employee.email}?`)) {
      return;
    }

    const identifier = employee.id || employee.email;
    setDeletingEmployeeId(employee.id ?? null);
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: identifier,
        organizationId: organization?.id,
      });
      alert("Empleado eliminado exitosamente");
      await handleUsersList();
    } catch (error) {
      console.error("Error eliminando empleado:", error);
      alert("Error al eliminar el empleado. Por favor, intenta de nuevo.");
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const handleUpdateMemberRole = async (
    employee: Employee,
    targetRole: "admin" | "member",
  ) => {
    if (!employee.id) {
      alert("ID de empleado no encontrado.");
      return;
    }
    if (employee.role === "owner") {
      alert("No puedes cambiar el rol del propietario.");
      return;
    }
    if (employee.role === targetRole) {
      return;
    }

    const setLoading =
      targetRole === "admin" ? setPromotingMemberId : setDemotingMemberId;
    setLoading(employee.id);
    try {
      await authClient.organization.updateMemberRole({
        memberId: employee.id,
        role: targetRole,
        organizationId: organization?.id,
      });
      alert(
        targetRole === "admin"
          ? "Empleado promovido a administrador"
          : "Empleado degradado a miembro",
      );
      await handleUsersList();
    } catch (error) {
      console.error("Error actualizando rol:", error);
      alert("No se pudo actualizar el rol. Intenta de nuevo.");
    } finally {
      setLoading(null);
    }
  };

  const handlePromoteEmployee = (employee: Employee) =>
    handleUpdateMemberRole(employee, "admin");

  const handleDemoteEmployee = (employee: Employee) =>
    handleUpdateMemberRole(employee, "member");

  const columns = createEmployeeColumns({
    shifts,
    geofences,
    onAssignShift: handleAssignShift,
    onAssignLocations: handleAssignLocations,
    onRemoveLocation: handleRemoveLocation,
    onViewEmployee: handleViewEmployeeDetails,
    onManageEmployee: handleManageEmployee,
    onDeleteEmployee: handleDeleteEmployee,
    onPromoteEmployee: handlePromoteEmployee,
    onDemoteEmployee: handleDemoteEmployee,
    deletingEmployeeId,
    promotingMemberId,
    demotingMemberId,
  });

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableRowSelection: true,
  });

  const getSelectedEmployees = () =>
    table.getSelectedRowModel().rows.map((row) => row.original);

  const handleBulkRemoveEmployees = async () => {
    const selectedEmployees = getSelectedEmployees();
    if (selectedEmployees.length === 0) {
      alert("Selecciona al menos un empleado.");
      return;
    }

    const pendingInvites = selectedEmployees.filter(
      (employee) => employee.status === "pending" && employee.invitationId,
    );
    const activeMembers = selectedEmployees.filter(
      (employee) => employee.status === "active" && (employee.id || employee.email),
    );

    if (pendingInvites.length === 0 && activeMembers.length === 0) {
      alert("No hay acciones disponibles para los registros seleccionados.");
      return;
    }

    if (
      !window.confirm(
        `¿Deseas procesar ${selectedEmployees.length} registro(s)? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      await Promise.all([
        ...pendingInvites.map((employee) =>
          employee.invitationId
            ? authClient.organization.cancelInvitation({
                invitationId: employee.invitationId,
              })
            : Promise.resolve(),
        ),
        ...activeMembers.map((employee) =>
          authClient.organization.removeMember({
            memberIdOrEmail: employee.id || employee.email,
            organizationId: organization?.id,
          }),
        ),
      ]);
      alert("Acciones masivas completadas");
      await handleUsersList();
      table.resetRowSelection();
    } catch (error) {
      console.error("Error al ejecutar la acción masiva:", error);
      alert("Ocurrió un error. Por favor, intenta de nuevo.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkCopyEmails = async () => {
    const selectedEmployees = getSelectedEmployees();
    if (selectedEmployees.length === 0) {
      alert("Selecciona al menos un empleado.");
      return;
    }

    const emails = Array.from(
      new Set(
        selectedEmployees
          .map((employee) => employee.email)
          .filter((email): email is string => Boolean(email)),
      ),
    );

    if (emails.length === 0) {
      alert("Los registros seleccionados no tienen correos disponibles.");
      return;
    }

    const emailString = emails.join(", ");
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(emailString);
        alert("Correos copiados al portapapeles");
        return;
      } catch (error) {
        console.error("Error copiando correos:", error);
      }
    }

    window.prompt("Copia los correos manualmente:", emailString);
  };

  const employeeBulkActions: ActionMenuItem[] = [
    {
      label: "Eliminar seleccionados",
      icon: Trash2,
      action: handleBulkRemoveEmployees,
      destructive: true,
      disabled: isBulkProcessing,
    },
    {
      label: "Copiar correos",
      icon: Copy,
      action: handleBulkCopyEmails,
      disabled: isBulkProcessing,
    },
  ];

  const handleSubmitInvitation = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email =
      (form.querySelector("#employee-email") as HTMLInputElement)?.value ?? "";
    const result = await authClient.organization.inviteMember({
      email,
      role: "member",
    });

    if (result.error) {
      console.error(result.error);
    } else {
      await handleUsersList();
      form.reset();
    }
  };

  const loadShifts = async () => {
    try {
      const shiftList = await fetchShifts();
      setShifts(shiftList);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  };

  const loadGeofences = async () => {
    if (!organization?.id) return;
    try {
      const geofenceList = await fetchGeofences(organization.id);
      setGeofences(geofenceList);
    } catch (error) {
      console.error("Error fetching geofences:", error);
    }
  };

  const refreshInvitations = async () => {
    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
      const invitationsResult = await authClient.organization.listInvitations();
      const invitationsPayload = invitationsResult.data as any;
      const invitationsList = Array.isArray(invitationsPayload)
        ? invitationsPayload
        : Array.isArray(invitationsPayload?.invitations)
          ? invitationsPayload.invitations
          : [];
      const pendingList = invitationsList
        .filter((invitation: any) => invitation.status === "pending")
        .map((invitation: any) => ({
          id: invitation.id,
          email: invitation.email ?? "",
          role: invitation.role ?? "member",
          status: invitation.status ?? "pending",
          inviterId: invitation.inviterId ?? invitation.inviter_id,
          expiresAt: invitation.expiresAt ?? invitation.expires_at,
          createdAt: invitation.createdAt ?? invitation.created_at,
        }));
      setPendingInvitations(pendingList);
    } catch (error) {
      console.error("Error fetching invitaciones:", error);
      setInvitationsError("No pudimos cargar las invitaciones. Inténtalo de nuevo.");
    } finally {
      setInvitationsLoading(false);
    }
  };

  const refreshMembers = async () => {
    const currentUserEmail = user?.email;
    try {
      const membersResult = await authClient.organization.listMembers();
      const activeMembers: Employee[] =
        membersResult.data?.members?.map((member) => ({
          id: member.user?.id ?? "",
          email: member.user?.email ?? "",
          name: member.user?.name ?? "",
          isCurrentUser: currentUserEmail
            ? member.user?.email === currentUserEmail
            : false,
          status: "active",
          role: member.role ?? "member",
        })) ?? [];

      const membersWithExtraData = await Promise.all(
        activeMembers.map(async (member) => {
          if (!member.id) return member;
          let memberData = { ...member };

          try {
            const schedules = await fetchUserSchedules(member.id);
            const now = new Date();
            const activeSchedules = schedules.filter((schedule: any) => {
              const effectiveFrom = new Date(schedule.effective_from);
              const effectiveUntil = schedule.effective_until
                ? new Date(schedule.effective_until)
                : null;

              return (
                effectiveFrom <= now && (!effectiveUntil || effectiveUntil >= now)
              );
            });

            const activeSchedule = activeSchedules.sort((a: any, b: any) => {
              const dateA = new Date(a.created_at);
              const dateB = new Date(b.created_at);
              return dateB.getTime() - dateA.getTime();
            })[0];

            if (activeSchedule?.shift_id) {
              const shift = shifts.find((s) => s.id === activeSchedule.shift_id);
              if (shift) {
                memberData = {
                  ...memberData,
                  shift: {
                    id: shift.id,
                    name: shift.name,
                    color: shift.color,
                  },
                };
              }
            }

            const userGeofences = await fetchUserGeofences(member.id);
            memberData = {
              ...memberData,
              geofences: userGeofences,
            };
          } catch (error) {
            console.error(`Error fetching data for user ${member.id}:`, error);
          }

          return memberData;
        }),
      );

      setEmployees(membersWithExtraData);
    } catch (error) {
      console.error("Error fetching miembros:", error);
      setEmployees([]);
    }
  };

  const handleUsersList = async () => {
    await Promise.all([refreshMembers(), refreshInvitations()]);
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!window.confirm(`¿Deseas cancelar la invitación para ${email}?`)) {
      return;
    }
    setCancellingInvitationId(invitationId);
    try {
      await authClient.organization.cancelInvitation({ invitationId });
      alert("Invitación cancelada exitosamente");
      await refreshInvitations();
    } catch (error) {
      console.error("Error cancelando invitación:", error);
      alert("Error al cancelar la invitación. Por favor, intenta de nuevo.");
    } finally {
      setCancellingInvitationId(null);
    }
  };

  useEffect(() => {
    if (user && organization?.id) {
      void loadShifts();
      void loadGeofences();
    }
  }, [user, organization?.id]);

  useEffect(() => {
    if (user && shifts.length > 0 && geofences.length >= 0) {
      void handleUsersList();
    }
  }, [user, shifts, geofences, organization?.id]);

  useEffect(() => {
    if (user) {
      void refreshInvitations();
    }
  }, [user]);


  return (
    <div className="space-y-6 p-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle>Agregar empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmitInvitation}>
            <Field>
              <Label htmlFor="employee-email">Correo electrónico</Label>
              <Input
                id="employee-email"
                type="email"
                placeholder="correo@ejemplo.com"
              />
            </Field>
            <Button type="submit">Enviar invitación</Button>
          </form>
        </CardContent>
      </Card>

      <PendingInvitationsPanel
        invitations={pendingInvitations}
        loading={invitationsLoading}
        error={invitationsError}
        onCancelInvitation={handleCancelInvitation}
        cancellingInvitationId={cancellingInvitationId}
      />

      <Separator className="mt-8" />

      <DataTableCard
        title="Empleados"
        table={table}
        selectedCount={table.getSelectedRowModel().rows.length}
        bulkActionLabel="Acciones masivas"
        bulkActions={employeeBulkActions}
        className="mt-8"
      />

      {detailsEmployee && (
        <EmployeeDetailsDialog
          employee={detailsEmployee}
          open={Boolean(detailsEmployee)}
          onOpenChange={(open) => {
            if (!open) {
              setDetailsEmployee(null);
            }
          }}
        />
      )}

      {manageEmployee && manageEmployee.status === "active" && (
        <ManageEmployeeDialog
          employee={manageEmployee}
          shifts={shifts}
          geofences={geofences}
          onAssignShift={handleAssignShift}
          onAssignLocations={handleAssignLocations}
          onRemoveLocation={handleRemoveLocation}
          open={Boolean(manageEmployee)}
          onOpenChange={(open) => {
            if (!open) {
              setManageEmployee(null);
            }
          }}
        />
      )}
    </div>
  );
}
