import { createFileRoute, redirect } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { getUserOrganizations, setFirstOrganizationActive } from '@/server/organization.server'
import { ensureProtectedContext } from '@/lib/protected-context-query'

export const Route = createFileRoute('/_protected')({
  component: RouteComponent,
  beforeLoad: async ({ location, context }) => {
    const protectedContext = await ensureProtectedContext(context?.queryClient);
    const { isAuthenticated, isMember, organization } = protectedContext;

    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
          token: ""
        }
      });
    }

    // Check if user has an active organization
    if (!organization?.data) {
      const organizations = await getUserOrganizations();

      // If user has organizations, try to set the first one as active
      if (organizations?.data && organizations.data.length > 0) {
        try {
          await setFirstOrganizationActive();
          // Successfully set active organization - redirect to home to reload with org context
          throw redirect({ to: "/" });
        } catch (error) {
          console.error("Failed to set active organization in beforeLoad:", error);
          // Failed to set active - redirect to getting-started
          throw redirect({ to: "/getting-started" });
        }
      }
      
      // No organizations at all - redirect to getting started to create one
      throw redirect({ to: "/getting-started" });
    }

    if (isMember) {
      throw redirect({ to: "/getting-started" });
    }
  }
})

function RouteComponent() {
  return <Outlet />
}
