import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useRouter } from '@tanstack/react-router'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { getUser, isAuthenticated } from '@/server/auth.server'
import { getOrganization } from '@/server/organization.server'
import { useUserStore } from '@/store/user-store'
import { useOrganizationStore } from '@/store/organization-store'
import { useEffect } from 'react'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  loader: async () => {
    // Try to load user and organization data if available
    const auth = await isAuthenticated()
    
    if (!auth) {
      return { user: null, organization: null }
    }

    const user = await getUser()
    const organization = await getOrganization()

    return {
      user: user ?? null,
      organization: organization?.data ?? null,
    }
  },
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Detect if the current route is inside (auth)
  // Use useRouter to get current location

  const routesWithoutSidebar = ["/login", "/signup", "/create-organization"]

  const router = useRouter()
  const showSidebar = !routesWithoutSidebar.includes(router.state.location.pathname)

  // Load user and organization data into Zustand stores
  const { setUser } = useUserStore()
  const { setOrganization } = useOrganizationStore()
  const loaderData = Route.useLoaderData()

  useEffect(() => {
    if (loaderData?.user) {
      setUser(loaderData.user)
    }
    if (loaderData?.organization) {
      setOrganization(loaderData.organization)
    }
  }, [loaderData, setUser, setOrganization])

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
          <div className="flex-1">
            {children}
          </div>
        )}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
