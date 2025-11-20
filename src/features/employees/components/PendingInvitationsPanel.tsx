import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PendingInvitation } from "../types";
import { formatShortDate } from "../utils";

type PendingInvitationsPanelProps = {
  invitations: PendingInvitation[];
  loading: boolean;
  error: string | null;
  onCancelInvitation: (invitationId: string, email: string) => void;
  cancellingInvitationId: string | null;
};

export function PendingInvitationsPanel({
  invitations,
  loading,
  error,
  onCancelInvitation,
  cancellingInvitationId,
}: PendingInvitationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitaciones pendientes</CardTitle>
        <CardDescription>
          Gestiona las invitaciones enviadas que aún no han sido aceptadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!loading && !error && invitations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay invitaciones pendientes.
          </p>
        )}
        {invitations.length > 0 && (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold">{invitation.email}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {invitation.role}
                    </Badge>
                    {invitation.expiresAt && (
                      <span>Expira: {formatShortDate(invitation.expiresAt)}</span>
                    )}
                    {invitation.createdAt && (
                      <span>
                        Invitado el: {formatShortDate(invitation.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void onCancelInvitation(invitation.id, invitation.email)
                    }
                    disabled={cancellingInvitationId === invitation.id}
                  >
                    {cancellingInvitationId === invitation.id
                      ? "Cancelando..."
                      : "Cancelar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
