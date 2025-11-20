import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureProtectedContext } from "@/lib/protected-context-query";

export const Route = createFileRoute("/")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const protectedContext = await ensureProtectedContext(context?.queryClient);

    if (!protectedContext.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
          token: "",
        },
      });
    }

    const slug =
      (protectedContext.organization?.data as any)?.slug ??
      (protectedContext.organization?.data as any)?.organization?.slug ??
      null;

    if (slug) {
      throw redirect({ to: `/${slug}` });
    }

    throw redirect({ to: "/getting-started" });
  },
});

function RouteComponent() {
  return null;
}
