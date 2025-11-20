import { createFileRoute, redirect } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { setActiveOrganizationBySlug } from '@/server/organization.server'
import { ensureProtectedContext, protectedContextQueryKey } from '@/lib/protected-context-query'

export const Route = createFileRoute('/$orgSlug')({
  component: RouteComponent,
  beforeLoad: async ({ location, context, params }) => {
    const slug = params.orgSlug;
    if (!slug) {
      throw redirect({ to: "/getting-started" });
    }

    let protectedContext = await ensureProtectedContext(context?.queryClient);
    const { isAuthenticated } = protectedContext;

    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
          token: ""
        }
      });
    }

    const currentSlug =
      (protectedContext.organization?.data as any)?.slug ??
      (protectedContext.organization?.data as any)?.organization?.slug ??
      null;

    if (currentSlug !== slug) {
      try {
        await setActiveOrganizationBySlug({ data: { slug } });
        await context?.queryClient?.invalidateQueries({
          queryKey: protectedContextQueryKey,
        });
        protectedContext = await ensureProtectedContext(context?.queryClient);
      } catch (error) {
        console.error("Failed to activate organization for slug:", slug, error);
        throw redirect({ to: "/getting-started" });
      }
    }

    const activeSlug =
      (protectedContext.organization?.data as any)?.slug ??
      (protectedContext.organization?.data as any)?.organization?.slug ??
      null;

    if (activeSlug !== slug || !protectedContext.organization?.data) {
      throw redirect({ to: "/getting-started" });
    }

    if (protectedContext.membershipStatus === "unknown") {
      console.warn("Organization role could not be determined from protected context.");
    }
  }
})

function RouteComponent() {
  return <Outlet />
}
