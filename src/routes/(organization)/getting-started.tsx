import { useState, useEffect } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthData } from "@/hooks/use-auth-data";
import { getUserOrganizations } from "@/server/organization.server";
import { ensureProtectedContext } from "@/lib/protected-context-query";
import skyLogo from "@/assets/sky-logo.png"

export const Route = createFileRoute("/(organization)/getting-started")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const {
      isAuthenticated,
      membershipStatus,
      organization,
      pendingInvitations,
    } = await ensureProtectedContext(context?.queryClient);

    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }

    const hasOrganization = Boolean(organization?.data);
    if (hasOrganization) {
      throw redirect({ to: "/" });
    }

    const shouldAcceptInvitation =
      (membershipStatus === "member" || membershipStatus === "unknown" || membershipStatus === "none") &&
      pendingInvitations.length > 0;

    if (shouldAcceptInvitation) {
      const invitation = pendingInvitations[0];
      throw redirect({
        to: "/accept-invitation",
        search: { token: invitation?.id || "" },
      });
    }
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const { session, organization } = useAuthData();
  const [hasOrganizations, setHasOrganizations] = useState(Boolean(organization));

  useEffect(() => {
    // Fallback lookup in case organization data isn't yet available in React Query cache
    getUserOrganizations().then((organizations) => {
      if (organizations.data && organizations.data.length > 0) {
        const org = Boolean(organizations.data[0].id);
        setHasOrganizations(org);
      } else {
        setHasOrganizations(false);
      }
    });
  }, [organization?.id])

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center flex flex-col items-center gap-2">
          <img src="/sky-logo.png" alt="Sky Logo" className="w-16 h-16 mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">
            ¡Bienvenido a SkyHR! 👋
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Business Owner Card */}
          <Card className="relative overflow-hidden border-2 transition-all hover:border-brand/20 hover:shadow-lg">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6 text-primary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
                  />
                </svg>
              </div>
              <CardTitle className="text-xl">¿Eres dueño de negocio?</CardTitle>
              <CardDescription className="text-base">
                Crea tu organización y comienza a gestionar tu equipo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <svg
                    className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-primary"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>Gestiona empleados y equipos</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-primary"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>Controla horarios y ubicaciones</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-primary"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>Invita a tu equipo a unirse</span>
                </li>
              </ul>
              <Button
                onClick={() => navigate({ to: "/create-organization" })}
                className="w-full"
                size="lg"
                disabled={hasOrganizations}
              >
                {hasOrganizations ? "Solicita tu invitación" : "Crear mi organización"}
              </Button>
            </CardContent>
          </Card>

          {/* Employee Card */}
          <Card className="relative overflow-hidden border-2 transition-all hover:border-brand/20 hover:shadow-lg">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6 text-blue-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
              <CardTitle className="text-xl">¿Eres empleado?</CardTitle>
              <CardDescription className="text-base">
                Solicita un enlace de invitación a tu empleador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="mb-2 text-sm font-medium">
                    Para unirte a tu organización:
                  </p>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start">
                      <span className="mr-2 font-semibold text-foreground">
                        1.
                      </span>
                      <span>
                        Contacta a tu empleador o administrador de recursos
                        humanos
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 font-semibold text-foreground">
                        2.
                      </span>
                      <span>
                        Pídeles que te envíen un enlace de invitación a tu
                        correo:
                      </span>
                    </li>
                  </ol>
                </div>

                {session?.user?.email && (
                  <div className="rounded-lg border bg-background p-3">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Tu correo electrónico:
                    </p>
                    <p className="font-mono text-sm font-medium">
                      {session.user.email}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border-l-4 border-blue-500 bg-blue-500/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium italic">Consejo:</span> Una vez que
                    recibas el enlace de invitación por correo, haz click en él
                    para unirte automáticamente a tu organización.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate({ to: "/" })}
                className="w-full"
                size="lg"
              >
                Volver a inicio
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Necesitas ayuda?{" "}
            <a href="#" className="font-medium text-primary hover:underline">
              Contáctanos
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
