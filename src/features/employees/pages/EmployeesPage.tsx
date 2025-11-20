import { useState } from "react";
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
import { useOrganizationStore } from "@/store/organization-store";
import type { Employee } from "../types";
import { PendingInvitationsPanel } from "../components/PendingInvitationsPanel";
import { EmployeeDetailsDialog } from "../components/EmployeeDetailsDialog";
import { ManageEmployeeDialog } from "../components/ManageEmployeeDialog";
import { createEmployeeColumns } from "../components/EmployeesTableColumns";
import {
  useShifts,
  useGeofences,
  useEmployees,
  useInvitations,
  useAssignShift,
  useAssignLocations,
  useRemoveLocation,
  useAssignHourlyRate,
  useUpdateOvertime,
  useDeleteEmployee,
  useUpdateMemberRole,
  useInviteMember,
  useCancelInvitation,
  useBulkRemoveEmployees,
} from "../hooks/useEmployees";

export function EmployeesPage() {
  const [detailsEmployee, setDetailsEmployee] = useState<Employee | null>(null);
  const [manageEmployee, setManageEmployee] = useState<Employee | null>(null);
  const { organization } = useOrganizationStore();

  // React Query hooks
  const { data: shifts = [] } = useShifts();
  const { data: geofences = [] } = useGeofences(organization?.id);
  const { data: employees = [] } = useEmployees();
  const { data: pendingInvitations = [], isLoading: invitationsLoading, error: invitationsError } = useInvitations();

  // Mutation hooks
  const assignShiftMutation = useAssignShift();
  const assignLocationsMutation = useAssignLocations();
  const removeLocationMutation = useRemoveLocation();
  const assignHourlyRateMutation = useAssignHourlyRate();
  const updateOvertimeMutation = useUpdateOvertime();
  const deleteEmployeeMutation = useDeleteEmployee();
  const updateMemberRoleMutation = useUpdateMemberRole();
  const inviteMemberMutation = useInviteMember();
  const cancelInvitationMutation = useCancelInvitation();
  const bulkRemoveEmployeesMutation = useBulkRemoveEmployees();

  const handleAssignShift = async (
    employeeId: string,
    shiftId: string,
    effectiveFrom: string,
    effectiveUntil?: string,
  ) => {
    await assignShiftMutation.mutateAsync({
      employeeId,
      shiftId,
      effectiveFrom,
      effectiveUntil,
    });
  };

  const handleUpdateOvertime = async (
    employeeId: string,
    overtimeAllowed: boolean,
  ) => {
    await updateOvertimeMutation.mutateAsync({
      employeeId,
      overtimeAllowed,
    });
  };

  const handleAssignLocations = async (
    employeeId: string,
    geofenceIds: string[],
    assignAll?: boolean,
  ) => {
    await assignLocationsMutation.mutateAsync({
      employeeId,
      geofenceIds,
      assignAll,
    });
  };

  const handleRemoveLocation = async (employeeId: string, geofenceId: string) => {
    await removeLocationMutation.mutateAsync({
      employeeId,
      geofenceId,
    });
  };

  const handleAssignHourlyRate = async (
    employeeId: string,
    hourlyRate: number,
    _effectiveFrom: string,
    _effectiveUntil?: string,
  ) => {
    await assignHourlyRateMutation.mutateAsync({
      employeeId,
      hourlyRate,
    });
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

    await deleteEmployeeMutation.mutateAsync(employee);
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

    await updateMemberRoleMutation.mutateAsync({
      employee,
      targetRole,
    });
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
    onAssignHourlyRate: handleAssignHourlyRate,
    onViewEmployee: handleViewEmployeeDetails,
    onManageEmployee: handleManageEmployee,
    onDeleteEmployee: handleDeleteEmployee,
    onPromoteEmployee: handlePromoteEmployee,
    onDemoteEmployee: handleDemoteEmployee,
    deletingEmployeeId: deleteEmployeeMutation.isPending && deleteEmployeeMutation.variables?.id ? deleteEmployeeMutation.variables.id : null,
    promotingMemberId: updateMemberRoleMutation.isPending && updateMemberRoleMutation.variables?.targetRole === "admin" && updateMemberRoleMutation.variables.employee.id ? updateMemberRoleMutation.variables.employee.id : null,
    demotingMemberId: updateMemberRoleMutation.isPending && updateMemberRoleMutation.variables?.targetRole === "member" && updateMemberRoleMutation.variables.employee.id ? updateMemberRoleMutation.variables.employee.id : null,
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

    try {
      await bulkRemoveEmployeesMutation.mutateAsync(selectedEmployees);
      table.resetRowSelection();
    } catch (error) {
      // Error handling is done in the mutation hook
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
      disabled: bulkRemoveEmployeesMutation.isPending,
    },
    {
      label: "Copiar correos",
      icon: Copy,
      action: handleBulkCopyEmails,
      disabled: bulkRemoveEmployeesMutation.isPending,
    },
  ];

  const handleSubmitInvitation = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email =
      (form.querySelector("#employee-email") as HTMLInputElement)?.value ?? "";
    
    try {
      await inviteMemberMutation.mutateAsync(email);
      form.reset();
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!window.confirm(`¿Deseas cancelar la invitación para ${email}?`)) {
      return;
    }
    
    try {
      await cancelInvitationMutation.mutateAsync(invitationId);
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };


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
        error={invitationsError ? (invitationsError instanceof Error ? invitationsError.message : String(invitationsError)) : null}
        onCancelInvitation={handleCancelInvitation}
        cancellingInvitationId={cancelInvitationMutation.isPending && cancelInvitationMutation.variables ? cancelInvitationMutation.variables : null}
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
          onAssignHourlyRate={handleAssignHourlyRate}
          onUpdateOvertime={handleUpdateOvertime}
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
