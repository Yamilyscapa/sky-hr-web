import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { useRouter } from "@tanstack/react-router";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useUserStore } from "@/store/user-store";
import { useOrganizationStore } from "@/store/organization-store";
import { useEffect } from "react";
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
  
  // Routes that don't need sidebar or auth data
  const routesWithoutSidebar = [
    "/login",
    "/signup",
    "/create-organization",
    "/accept-invitation",
  ];
  
  const showSidebar = !routesWithoutSidebar.includes(
    router.state.location.pathname,
  );
  
  // Skip auth data fetching for auth routes (Option 3)
  const isAuthRoute = routesWithoutSidebar.includes(
    router.state.location.pathname,
  );

  // Fetch auth data using React Query with caching (Option 1)
  // Skip fetching entirely on auth routes to improve performance
  const { user, organization } = useAuthData({ enabled: !isAuthRoute });
  
  // Sync with Zustand stores
  const { setUser } = useUserStore();
  const { setOrganization } = useOrganizationStore();

  useEffect(() => {
    if (!isAuthRoute) {
      if (user) {
        setUser(user);
      }
      if (organization) {
        setOrganization(organization);
      }
    }
  }, [user, organization, setUser, setOrganization, isAuthRoute]);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
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
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
