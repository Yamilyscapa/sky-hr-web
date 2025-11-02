import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAuthenticated } from "@/server/auth.server";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(organization)/accept-invitation")({
  component: RouteComponent,
  beforeLoad: async () => {
    const auth = await isAuthenticated();

    if (auth) {
      throw redirect({ to: "/login" });
    }
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || "",
    };
  },
});

function RouteComponent() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [authModal, setAuthModal] = useState<boolean>(false);

  useEffect(() => {
    async function acceptInvitation() {
      const auth = await isAuthenticated();

      if (!auth) {
        setAuthModal(true);
        return;
      } else {
        setAuthModal(false);
      }

      if (!token) {
        setStatus("error");
        setMessage("No se proporcionó un token de invitación válido.");
        return;
      }

      try {
        const result = await authClient.organization.acceptInvitation({
          invitationId: token,
        });

        if (result.error) {
          setStatus("error");
          setMessage(
            "Error al aceptar la invitación. El token puede haber expirado.",
          );
        } else {
          setStatus("success");
          setMessage("¡Invitación aceptada exitosamente! Redirigiendo...");
          setTimeout(() => {
            navigate({ to: "/" });
          }, 2000);
        }
      } catch (error) {
        setStatus("error");
        setMessage("Ocurrió un error al procesar la invitación.");
        console.error("Error accepting invitation:", error);
      }
    }

    acceptInvitation();
  }, [token, navigate]);

  return (
    <>
      {authModal ? (
        <Dialog open={authModal} onOpenChange={setAuthModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Error al aceptar la invitación</DialogTitle>
              <DialogDescription>
                Necesita una cuenta para aceptar la invitación.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={() =>
                  navigate({
                    to: "/login",
                    search: { redirect: "/accept-invitation", token },
                  })
                }
              >
                Iniciar sesión
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/signup",
                    search: { redirect: "/accept-invitation", token },
                  })
                }
              >
                Registrarse
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Aceptar invitación</CardTitle>
            <CardDescription>
              {status === "loading" && "Procesando tu invitación..."}
              {status === "success" && "Invitación aceptada"}
              {status === "error" && "Error al aceptar invitación"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {status === "loading" && (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm">{message || "Procesando..."}</p>
                </>
              )}
              {status === "success" && (
                <>
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                  <p className="text-sm text-green-600">{message}</p>
                </>
              )}
              {status === "error" && (
                <>
                  <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">
                    ✕
                  </div>
                  <p className="text-sm text-red-600">{message}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
