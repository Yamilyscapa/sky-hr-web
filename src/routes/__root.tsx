import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouter,
  Link,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import {
  TanStackDevtools,
  type TanStackDevtoolsReactPlugin,
} from "@tanstack/react-devtools";

import { createTanStackQueryDevtoolsPlugin } from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useUserStore } from "@/store/user-store";
import {
  useOrganizationStore,
  attachCurrentMemberData,
} from "@/store/organization-store";
import type { User } from "@/store/user-store";
import type { Organization } from "@/store/organization-store";
import { useEffect, useMemo } from "react";
import { useAuthData } from "@/hooks/use-auth-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundComponent,
  // No loader - using React Query for data fetching with caching
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = router.options.context?.queryClient;
  const devtoolsPlugins = useMemo<TanStackDevtoolsReactPlugin[]>(() => {
    const plugins: TanStackDevtoolsReactPlugin[] = [
      {
        name: "Tanstack Router",
        render: <TanStackRouterDevtoolsPanel />,
      },
    ];

    if (queryClient) {
      plugins.push(createTanStackQueryDevtoolsPlugin(queryClient));
    }

    return plugins;
  }, [queryClient]);
  
  // Routes that don't need sidebar or auth data
  const routesWithoutSidebar = [
    "/login",
    "/signup",
    "/create-organization",
    "/accept-invitation",
    "/getting-started",
  ];
  
  const showSidebar = !routesWithoutSidebar.includes(
    router.state.location.pathname,
  );
  
  // Skip auth data fetching for auth routes (Option 3)
  const isAuthRoute = routesWithoutSidebar.includes(
    router.state.location.pathname,
  );

  // Sync with Zustand stores
  const { setUser } = useUserStore();
  const { setOrganization } = useOrganizationStore();

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {!isAuthRoute && (
          <AuthDataSynchronizer
            setUser={setUser}
            setOrganization={setOrganization}
          />
        )}
        {showSidebar ? (
          <SidebarProvider>
            <AppSidebar />
            <div className="flex-1">
              <div className="flex items-center gap-2 p-4">
                <SidebarTrigger data-sidebar="trigger" />
              </div>
              {children}
            </div>
          </SidebarProvider>
        ) : (
          <div className="flex-1">{children}</div>
        )}
        {!isAuthRoute && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={devtoolsPlugins}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}

function AuthDataSynchronizer({
  setUser,
  setOrganization,
}: {
  setUser: (user: User | null) => void;
  setOrganization: (organization: Organization | null) => void;
}) {
  const { user, organization } = useAuthData();

  useEffect(() => {
    setUser(user ?? null);
    const enrichedOrganization = attachCurrentMemberData(organization ?? null, user);
    setOrganization(enrichedOrganization);
  }, [user, organization, setUser, setOrganization]);

  return null;
}

function NotFoundComponent() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <span className="text-3xl font-bold text-muted-foreground">404</span>
          </div>
          <CardTitle className="text-2xl">Página no encontrada</CardTitle>
          <CardDescription>
            Lo sentimos, la página que estás buscando no existe o ha sido movida.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link to="/">Ir al inicio</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.history.back()}
            className="w-full"
          >
            Volver atrás
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
