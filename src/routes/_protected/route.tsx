import { createFileRoute, redirect } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { isAuthenticated, notMemberRoute } from '@/server/auth.server'
import { getOrganization, getUserOrganizations } from '@/server/organization.server'
import { authClient } from '@/lib/auth-client'

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

    if (!organization?.data) {
      throw redirect({ to: "/getting-started" });
    }

    if (!organization?.data) {
      const organizations = await getUserOrganizations();

      // If user has organizations, set the first one as active
      if (organizations?.data && organizations.data.length > 0) {
        const org = organizations.data[0];
        if (org.id) {
          await authClient.organization.setActive({
            organizationId: org.id,
          });
        }
      } else {
        throw redirect({ to: "/getting-started" });
      }
    }

    if (isMember) {
      throw redirect({ to: "/getting-started" });
    }
  }
})

function RouteComponent() {
  return <Outlet />
}
