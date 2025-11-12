import { createFileRoute, redirect } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { isAuthenticated, notMemberRoute } from '@/server/auth.server'
import { getOrganization, getUserOrganizations, setFirstOrganizationActive } from '@/server/organization.server'

export const Route = createFileRoute('/_protected')({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    const auth = await isAuthenticated();
    const isMember = await notMemberRoute();
    const organization = await getOrganization();

    if (!auth) {
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
