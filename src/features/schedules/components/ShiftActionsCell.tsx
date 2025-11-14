import { CheckCircle, Edit, Eye, Trash2 } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import type { Shift } from "../types";

type ShiftActionsCellProps = {
  shift: Shift;
  onView: (shift: Shift) => void;
  onEdit: (shift: Shift) => void;
  onToggleStatus: (shift: Shift) => void;
  isProcessing: boolean;
};

export function ShiftActionsCell({
  shift,
  onView,
  onEdit,
  onToggleStatus,
  isProcessing,
}: ShiftActionsCellProps) {
  const deleteLabel = shift.active ? "Desactivar" : "Activar";

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: Eye,
      action: () => onView(shift),
    },
    {
      label: "Editar",
      icon: Edit,
      action: () => onEdit(shift),
    },
    {
      label: deleteLabel,
      icon: shift.active ? Trash2 : CheckCircle,
      action: () => onToggleStatus(shift),
      destructive: shift.active,
      disabled: isProcessing,
    },
  ];

  return <ActionMenu items={items} />;
}
