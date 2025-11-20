import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import type { PermissionStatus } from "@/api";

const statusConfig: Record<
  PermissionStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  approved: {
    label: "Aprobado",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rechazado",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
};

export function PermissionStatusBadge({ status }: { status: PermissionStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
