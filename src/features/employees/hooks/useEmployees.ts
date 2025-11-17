import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useUserStore } from "@/store/user-store";
import { useOrganizationStore } from "@/store/organization-store";
import type { Employee, Geofence, Shift, PendingInvitation } from "../types";
import {
  EMPLOYEES_QUERY_KEY,
  SHIFTS_QUERY_KEY,
  GEOFENCES_QUERY_KEY,
  INVITATIONS_QUERY_KEY,
} from "../types";
import {
  assignGeofences,
  assignShift,
  assignHourlyRate,
  fetchGeofences,
  fetchHourlyRate,
  fetchOvertime,
  fetchShifts,
  fetchUserGeofences,
  fetchUserSchedules,
  removeGeofence,
  updateOvertime,
} from "../data";

// Query hooks
export function useShifts() {
  return useQuery<Shift[]>({
    queryKey: SHIFTS_QUERY_KEY,
    queryFn: async () => {
      const shiftList = await fetchShifts();
      return shiftList;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGeofences(organizationId: string | undefined) {
  return useQuery<Geofence[]>({
    queryKey: [...GEOFENCES_QUERY_KEY, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const geofenceList = await fetchGeofences(organizationId);
      return geofenceList;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInvitations() {
  return useQuery<PendingInvitation[]>({
    queryKey: INVITATIONS_QUERY_KEY,
    queryFn: async () => {
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
      return pendingList;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

const EMPLOYEE_OVERTIME_QUERY_KEY = ["employee-overtime"] as const;
const EMPLOYEE_HOURLY_RATE_QUERY_KEY = ["employee-hourly-rate"] as const;

export const employeeOvertimeQueryKey = (employeeId?: string) => [
  ...EMPLOYEE_OVERTIME_QUERY_KEY,
  employeeId ?? "unknown",
];

export const employeeHourlyRateQueryKey = (employeeId?: string) => [
  ...EMPLOYEE_HOURLY_RATE_QUERY_KEY,
  employeeId ?? "unknown",
];

export function useEmployeeOvertime(
  employeeId?: string,
  enabled = true,
) {
  return useQuery<boolean>({
    queryKey: employeeOvertimeQueryKey(employeeId),
    queryFn: async () => {
      if (!employeeId) {
        return false;
      }
      return await fetchOvertime(employeeId);
    },
    enabled: Boolean(employeeId && enabled),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useEmployeeHourlyRate(
  employeeId?: string,
  enabled = true,
) {
  return useQuery<number | null>({
    queryKey: employeeHourlyRateQueryKey(employeeId),
    queryFn: async () => {
      if (!employeeId) {
        return null;
      }
      return await fetchHourlyRate(employeeId);
    },
    enabled: Boolean(employeeId && enabled),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useEmployees() {
  const { user } = useUserStore();
  const { organization } = useOrganizationStore();
  const { data: shifts = [] } = useShifts();
  const { data: geofences = [] } = useGeofences(organization?.id);

  return useQuery<Employee[]>({
    queryKey: [...EMPLOYEES_QUERY_KEY, organization?.id, shifts.length, geofences.length],
    queryFn: async () => {
      if (!user || !organization?.id) return [];

      const currentUserEmail = user.email;
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

      return membersWithExtraData;
    },
    enabled: !!user && !!organization?.id && shifts.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation hooks
export function useAssignShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      shiftId: string;
      effectiveFrom: string;
      effectiveUntil?: string;
    }) => {
      const effectiveFromISO = new Date(payload.effectiveFrom).toISOString();
      const effectiveUntilISO = payload.effectiveUntil
        ? new Date(payload.effectiveUntil).toISOString()
        : undefined;

      const response = await assignShift({
        user_id: payload.employeeId,
        shift_id: payload.shiftId,
        effective_from: effectiveFromISO,
        effective_until: effectiveUntilISO,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    },
    onSuccess: () => {
      toast.success("Turno asignado exitosamente");
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo asignar el turno",
      );
    },
  });
}

export function useAssignLocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      geofenceIds: string[];
      assignAll?: boolean;
    }) => {
      const response = await assignGeofences({
        user_id: payload.employeeId,
        geofence_ids: payload.assignAll ? undefined : payload.geofenceIds,
        assign_all: payload.assignAll,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    },
    onSuccess: () => {
      toast.success("Ubicaciones asignadas exitosamente");
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudieron asignar las ubicaciones",
      );
    },
  });
}

export function useRemoveLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      geofenceId: string;
    }) => {
      const response = await removeGeofence({
        user_id: payload.employeeId,
        geofence_id: payload.geofenceId,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    },
    onSuccess: () => {
      toast.success("Ubicación removida exitosamente");
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo remover la ubicación",
      );
    },
  });
}

export function useAssignHourlyRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      hourlyRate: number;
    }) => {
      const response = await assignHourlyRate(
        payload.employeeId,
        payload.hourlyRate,
      );

      // 404 is normal when payroll data doesn't exist yet (not yet assigned)
      if (response && !response.ok && response.status !== 404) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    },
    onSuccess: () => {
      toast.success("Tarifa por hora asignada exitosamente");
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo asignar la tarifa por hora",
      );
    },
  });
}

export function useUpdateOvertime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      overtimeAllowed: boolean;
    }) => {
      const response = await updateOvertime(
        payload.employeeId,
        payload.overtimeAllowed,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.overtimeAllowed
          ? "Horas extra habilitadas"
          : "Horas extra deshabilitadas",
      );
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar las horas extra",
      );
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { organization } = useOrganizationStore();

  return useMutation({
    mutationFn: async (employee: Employee) => {
      if (!employee.id && !employee.email) {
        throw new Error("No se encontró el identificador del empleado.");
      }

      if (employee.role === "owner") {
        throw new Error("No puedes eliminar al propietario de la organización.");
      }

      const identifier = employee.id || employee.email;
      await authClient.organization.removeMember({
        memberIdOrEmail: identifier,
        organizationId: organization?.id,
      });
    },
    onSuccess: () => {
      toast.success("Empleado eliminado exitosamente");
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
      void queryClient.invalidateQueries({
        queryKey: INVITATIONS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al eliminar el empleado. Por favor, intenta de nuevo.",
      );
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { organization } = useOrganizationStore();

  return useMutation({
    mutationFn: async (payload: {
      employee: Employee;
      targetRole: "admin" | "member";
    }) => {
      if (!payload.employee.id) {
        throw new Error("ID de empleado no encontrado.");
      }
      if (payload.employee.role === "owner") {
        throw new Error("No puedes cambiar el rol del propietario.");
      }
      if (payload.employee.role === payload.targetRole) {
        return;
      }

      await authClient.organization.updateMemberRole({
        memberId: payload.employee.id,
        role: payload.targetRole,
        organizationId: organization?.id,
      });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.targetRole === "admin"
          ? "Empleado promovido a administrador"
          : "Empleado degradado a miembro",
      );
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el rol. Intenta de nuevo.",
      );
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const result = await authClient.organization.inviteMember({
        email,
        role: "member",
      });

      if (result.error) {
        throw new Error(result.error.message || "Error al enviar la invitación");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Invitación enviada exitosamente");
      void queryClient.invalidateQueries({
        queryKey: INVITATIONS_QUERY_KEY,
        exact: false,
      });
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al enviar la invitación. Por favor, intenta de nuevo.",
      );
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      await authClient.organization.cancelInvitation({ invitationId });
    },
    onSuccess: () => {
      toast.success("Invitación cancelada exitosamente");
      void queryClient.invalidateQueries({
        queryKey: INVITATIONS_QUERY_KEY,
        exact: false,
      });
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al cancelar la invitación. Por favor, intenta de nuevo.",
      );
    },
  });
}

export function useBulkRemoveEmployees() {
  const queryClient = useQueryClient();
  const { organization } = useOrganizationStore();

  return useMutation({
    mutationFn: async (employees: Employee[]) => {
      const pendingInvites = employees.filter(
        (employee) => employee.status === "pending" && employee.invitationId,
      );
      const activeMembers = employees.filter(
        (employee) => employee.status === "active" && (employee.id || employee.email),
      );

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
    },
    onSuccess: () => {
      toast.success("Acciones masivas completadas");
      void queryClient.invalidateQueries({
        queryKey: EMPLOYEES_QUERY_KEY,
        exact: false,
      });
      void queryClient.invalidateQueries({
        queryKey: INVITATIONS_QUERY_KEY,
        exact: false,
      });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocurrió un error. Por favor, intenta de nuevo.",
      );
    },
  });
}
