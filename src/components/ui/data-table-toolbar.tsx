import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DataTableToolbarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  refresh?: {
    onClick: () => void;
    isRefreshing?: boolean;
  };
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function DataTableToolbar({
  search,
  refresh,
  actions,
  children,
  className,
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 space-y-3",
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {search ? (
          <Input
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder={search.placeholder ?? "Buscar"}
            className="max-w-sm"
          />
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {refresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refresh.onClick}
              disabled={refresh.isRefreshing}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4 mr-2",
                  refresh.isRefreshing && "animate-spin",
                )}
              />
              Actualizar
            </Button>
          )}
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}
