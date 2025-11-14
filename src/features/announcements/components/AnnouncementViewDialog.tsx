import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Announcement } from "../types";
import { formatDateTime } from "../utils";
import { PriorityBadge } from "./PriorityBadge";

type AnnouncementViewDialogProps = {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AnnouncementViewDialog({
  announcement,
  open,
  onOpenChange,
}: AnnouncementViewDialogProps) {
  if (!announcement) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription>
            Publicado el {formatDateTime(announcement.published_at)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Prioridad</p>
            <PriorityBadge priority={announcement.priority} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Contenido</p>
            <p className="leading-relaxed">{announcement.content}</p>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Publicado</p>
              <p className="font-medium">
                {formatDateTime(announcement.published_at)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expira</p>
              <p className="font-medium">
                {announcement.expires_at
                  ? formatDateTime(announcement.expires_at)
                  : "Sin expiración"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
