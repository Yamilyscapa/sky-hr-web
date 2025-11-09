import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouter,
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
import { useOrganizationStore } from "@/store/organization-store";
import type { User } from "@/store/user-store";
import type { Organization } from "@/store/organization-store";
import { useEffect, useMemo } from "react";
import { useAuthData } from "@/hooks/use-auth-data";

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
    if (user) {
      setUser(user);
    }
    if (organization) {
      setOrganization(organization);
    }
  }, [user, organization, setUser, setOrganization]);

  return null;
}
