import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ensureProtectedContext } from "@/lib/protected-context-query";
import { isAuthenticated } from "@/server/auth.server";

export const Route = createFileRoute("/(organization)/accept-invitation")({
  component: RouteComponent,
  beforeLoad: async ({ search, context }) => {
    const auth = await isAuthenticated();
    const token = (search as any).token as string;

    // If not authenticated, redirect to login with invitation token
    if (!auth && token) {
      throw redirect({
        to: "/login",
        search: { redirect: "/accept-invitation", token },
      });
    }

    // If authenticated but no token, redirect to home
    if (auth && !token) {
      throw redirect({ to: "/" });
    }

    if (auth) {
      const { organization } = await ensureProtectedContext(context?.queryClient);
      const hasOrganization = Boolean(organization?.data);

      if (hasOrganization) {
        throw redirect({ to: "/" });
      }
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
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const processedTokenRef = useRef<string | null>(null);

  function getFriendlyError(code: string | null) {
    switch (code) {
      case "INVITATION_ALREADY_ACCEPTED":
        return "Esta invitación ya fue aceptada. Si necesitas acceso, pide que te envíen un nuevo enlace.";
      case "INVITATION_EXPIRED":
        return "Esta invitación expiró. Solicita a tu administrador que genere un nuevo enlace.";
      case "INVITATION_NOT_FOUND":
        return "No encontramos esta invitación. Revisa que hayas copiado el enlace completo.";
      default:
        return "No pudimos procesar tu invitación. Intenta de nuevo o contacta a tu administrador.";
    }
  }

  const handleRetry = () => {
    setStatus("loading");
    setMessage("");
    setErrorCode(null);
    setAttempt((prev) => prev + 1);
  };

  const handleNavigateHome = () => {
    navigate({ to: "/getting-started" });
  };

  useEffect(() => {
    async function acceptInvitation() {
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
          const code = result.error.code ?? null;
          setErrorCode(code);
          setStatus("error");
          setMessage(getFriendlyError(code));
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

    if (token && processedTokenRef.current === token) {
      return;
    }

    if (token) {
      processedTokenRef.current = token;
    }

    acceptInvitation();
  }, [token, navigate, attempt]);

  return (
    <>
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
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-red-600">{message}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="default" onClick={handleRetry}>
                        Reintentar
                      </Button>
                      <Button variant="outline" onClick={handleNavigateHome}>
                        Volver al inicio
                      </Button>
                    </div>
                    {errorCode && (
                      <p className="text-xs text-muted-foreground">
                        Código: {errorCode}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
