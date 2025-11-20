import { Ban, CheckCircle, Clock, XCircle } from "lucide-react";
import type { ComponentType } from "react";
import type { Visitor } from "../types";

const statusConfig: Record<
  Visitor["status"],
  {
    label: string;
    className: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  approved: {
    label: "Aprobado",
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rechazado",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-gray-100 text-gray-800 border-gray-200",
    icon: Ban,
  },
};

export function StatusBadge({ status }: { status: Visitor["status"] }) {
  const config = statusConfig[status];
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
