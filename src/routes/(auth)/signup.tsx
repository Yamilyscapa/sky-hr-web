import { SignupForm } from "@/components/signup-form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/server/auth.server";

export const Route = createFileRoute("/(auth)/signup")({
  component: RouteComponent,
  beforeLoad: async ({ search }) => {
    const auth = await isAuthenticated();
    const redirectPath = (search as any).redirect as string;
    const token = (search as any).token as string;

    if (auth) {
      // If authenticated and has invitation token, redirect to accept-invitation
      if (redirectPath === "/accept-invitation" && token) {
        throw redirect({ to: "/accept-invitation", search: { token } });
      }
      throw redirect({ to: "/" });
    }
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || "",
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
