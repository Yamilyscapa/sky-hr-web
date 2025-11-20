import { SignupForm } from "@/components/signup-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/server/auth.server";
import {
  getAuthRedirectTarget,
  sanitizeRedirectPath,
} from "@/lib/auth-redirect";

export const Route = createFileRoute("/(auth)/signup")({
  component: RouteComponent,
  beforeLoad: async ({ search }) => {
    const auth = await isAuthenticated();

    if (auth) {
      const target = getAuthRedirectTarget(search, true);
      if (target) {
        throw redirect(target);
      }
    }
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: sanitizeRedirectPath(search.redirect),
      token: (search.token as string) || "",
    };
  },
});

function RouteComponent() {
  const { token, redirect } = Route.useSearch() as {
    token: string;
    redirect: string;
  };

  return (
    <div className="container mx-auto h-screen flex items-center justify-center">
      <div className="w-[600px]">
        <SignupForm inviteToken={token} redirect={redirect} />
      </div>
    </div>
  );
}
