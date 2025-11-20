import { AlertCircle, CheckCircle, Clock, UserX } from "lucide-react";
import type { ComponentType } from "react";
import type { AttendanceStatus } from "../types";

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string;
    className: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  on_time: {
    label: "A tiempo",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  late: {
    label: "Tarde",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  early: {
    label: "Temprano",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock,
  },
  absent: {
    label: "Ausente",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: UserX,
  },
  out_of_bounds: {
    label: "Fuera de área",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
  },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
