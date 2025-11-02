import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/server/auth.server";
import { getOrganization } from "@/server/organization.server";

export const Route = createFileRoute("/")({
  component: App,
  beforeLoad: async () => {
    const auth = await isAuthenticated();
    const organization = await getOrganization();

    if (!auth) {
      throw redirect({ to: "/login" });
    }

    if (auth && !organization?.data) {
      throw redirect({ to: "/create-organization" });
    }
  },
});

function App() {
  return (
    <>
      <div>Home Page</div>
    </>
  );
}
