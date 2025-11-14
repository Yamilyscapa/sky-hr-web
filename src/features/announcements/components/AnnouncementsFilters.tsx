import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectBase } from "@/components/ui/select-base";
import type {
  AnnouncementPriority,
  AnnouncementStatus,
} from "../types";
import {
  PRIORITY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from "../types";

type AnnouncementsFiltersProps = {
  priorityFilter: AnnouncementPriority | "all";
  onPriorityChange: (value: AnnouncementPriority | "all") => void;
  statusFilter: AnnouncementStatus | "all";
  onStatusChange: (value: AnnouncementStatus | "all") => void;
  includeExpired: boolean;
  onIncludeExpiredChange: (value: boolean) => void;
  includeFuture: boolean;
  onIncludeFutureChange: (value: boolean) => void;
  canManageAnnouncements: boolean;
};

export function AnnouncementsFilters({
  priorityFilter,
  onPriorityChange,
  statusFilter,
  onStatusChange,
  includeExpired,
  onIncludeExpiredChange,
  includeFuture,
  onIncludeFutureChange,
  canManageAnnouncements,
}: AnnouncementsFiltersProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="announcement-priority">Prioridad</FieldLabel>
          <FieldContent>
            <SelectBase
              id="announcement-priority"
              value={priorityFilter}
              onChange={(event) =>
                onPriorityChange(
                  event.target.value as AnnouncementPriority | "all",
                )
              }
            >
              {PRIORITY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectBase>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="announcement-status">Estado</FieldLabel>
          <FieldContent>
            <SelectBase
              id="announcement-status"
              value={statusFilter}
              onChange={(event) =>
                onStatusChange(
                  event.target.value as AnnouncementStatus | "all",
                )
              }
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectBase>
          </FieldContent>
        </Field>
      </div>

      {canManageAnnouncements && (
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeExpired}
              onCheckedChange={(checked) =>
                onIncludeExpiredChange(Boolean(checked))
              }
            />
            <span>Incluir expirados</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={includeFuture}
              onCheckedChange={(checked) =>
                onIncludeFutureChange(Boolean(checked))
              }
            />
            <span>Incluir futuros</span>
          </label>
        </div>
      )}
    </div>
  );
}
