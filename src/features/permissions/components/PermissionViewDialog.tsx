import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Permission } from "../types";
import type { UserInfo } from "../utils";
import { formatDateRange, formatDateTime } from "../utils";

type PermissionViewDialogProps = {
  permission: Permission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usersMap: Map<string, UserInfo>;
};

export function PermissionViewDialog({
  permission,
  open,
  onOpenChange,
  usersMap,
}: PermissionViewDialogProps) {
  if (!permission) {
    return null;
  }

  const userInfo = usersMap.get(permission.userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Solicitud de permiso</DialogTitle>
          <DialogDescription>
            {userInfo?.name ?? permission.userId}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Usuario</p>
            <p className="font-medium">
              {userInfo?.name ?? permission.userId}
            </p>
            {userInfo?.email && (
              <p className="text-sm text-muted-foreground">{userInfo.email}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Motivo</p>
            <p className="leading-relaxed">{permission.message}</p>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Vigencia</p>
              <p className="font-medium">
                {formatDateRange(permission.startingDate, permission.endDate)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Última actualización</p>
              <p className="font-medium">
                {formatDateTime(permission.updatedAt)}
              </p>
            </div>
          </div>
          {permission.supervisorComment && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Comentario del supervisor
              </p>
              <p className="leading-relaxed">
                {permission.supervisorComment}
              </p>
            </div>
          )}
          {permission.documentsUrl.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Documentos</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {permission.documentsUrl.map((url, index) => (
                  <li key={index}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Documento {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
