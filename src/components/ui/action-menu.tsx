import { cloneElement, isValidElement, type ReactElement } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LucideIcon, MoreHorizontal } from "lucide-react";

export type ActionMenuItem = {
  label: string;
  action: () => void | Promise<void>;
  icon?: LucideIcon;
  disabled?: boolean;
  destructive?: boolean;
  hidden?: boolean;
};

type DropdownAlign = "start" | "center" | "end";
type DropdownSide = "top" | "right" | "bottom" | "left";

interface ActionMenuProps {
  items: ActionMenuItem[];
  trigger?: ReactElement;
  align?: DropdownAlign;
  side?: DropdownSide;
  disabled?: boolean;
  menuClassName?: string;
  className?: string;
}

export function ActionMenu({
  items,
  trigger,
  align = "end",
  side = "bottom",
  disabled = false,
  menuClassName,
  className,
}: ActionMenuProps) {
  const visibleItems = items.filter((item) => !item.hidden);
  const isDisabled = disabled || visibleItems.length === 0;

  const defaultTrigger = (
    <button
      type="button"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      disabled={isDisabled}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Abrir acciones</span>
    </button>
  );

  const triggerNode = trigger
    ? isValidElement(trigger)
      ? cloneElement(trigger, {
          disabled: isDisabled || trigger.props.disabled,
        })
      : trigger
    : defaultTrigger;

  const handleAction = (action: () => void | Promise<void>) => {
    try {
      const maybePromise = action();
      if (maybePromise instanceof Promise) {
        maybePromise.catch((error) => {
          console.error("Error executing action menu item:", error);
        });
      }
    } catch (error) {
      console.error("Error executing action menu item:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isDisabled}>
        {triggerNode}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        className={cn("w-48", menuClassName)}
      >
        {visibleItems.map(({ label, icon: Icon, action, disabled, destructive }) => (
          <DropdownMenuItem
            key={label}
            disabled={disabled}
            onSelect={(event) => {
              if (disabled) {
                event.preventDefault();
                return;
              }
              handleAction(action);
            }}
            className={cn(
              "flex items-center gap-2",
              destructive && "text-destructive focus:text-destructive",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
