import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { SelectBase } from "@/components/ui/select-base";
import type { PermissionStatus } from "@/api";
import { STATUS_FILTER_OPTIONS } from "../types";

type PermissionsFiltersProps = {
  statusFilter: PermissionStatus | "all";
  onStatusChange: (value: PermissionStatus | "all") => void;
  canManagePermissions: boolean;
  selectedUserId?: string;
  onUserChange: (value: string | undefined) => void;
  users: Array<{ id: string; name: string; email: string }>;
};

export function PermissionsFilters({
  statusFilter,
  onStatusChange,
  canManagePermissions,
  selectedUserId,
  onUserChange,
  users,
}: PermissionsFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Field>
        <FieldLabel htmlFor="permission-status">Estado</FieldLabel>
        <FieldContent>
          <SelectBase
            id="permission-status"
            value={statusFilter}
            onChange={(event) =>
              onStatusChange(event.target.value as PermissionStatus | "all")
            }
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </SelectBase>
        </FieldContent>
      </Field>
      {canManagePermissions && (
        <Field>
          <FieldLabel htmlFor="permission-user">Usuario</FieldLabel>
          <FieldContent>
            <SelectBase
              id="permission-user"
              value={selectedUserId || "all"}
              onChange={(event) =>
                onUserChange(
                  event.target.value === "all"
                    ? undefined
                    : event.target.value,
                )
              }
            >
              <option value="all">Todos los usuarios</option>
              {users.map((user) => (
                <option value={user.id} key={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </SelectBase>
          </FieldContent>
        </Field>
      )}
    </div>
  );
}
