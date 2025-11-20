import { Badge } from "@/components/ui/badge";
import type { AnnouncementPriority, AnnouncementStatus } from "../types";

export function PriorityBadge({
  priority,
}: {
  priority: AnnouncementPriority;
}) {
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

export function StatusBadge({ status }: { status: AnnouncementStatus }) {
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
