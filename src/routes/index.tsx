import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/server/auth.server";
import { getOrganization, getUserOrganizations } from "@/server/organization.server";

export const Route = createFileRoute("/")({
  component: App,
  beforeLoad: async () => {
    const auth = await isAuthenticated();

    if (!auth) {
      throw redirect({ to: "/login", search: { redirect: "", token: "" } });
    }

    // Get current active organization
    const organization = await getOrganization();
    
    // If no active organization, check if user has any organizations
    if (!organization?.data) {
      const organizations = await getUserOrganizations();
      
      // If user has organizations, set the first one as active
      if (organizations?.data && organizations.data.length > 0) {
        // User has organizations but no active one - this will be handled by the app
        // For now, we'll just let them through and they can select an organization
      } else {
        // No organizations at all - redirect to getting started screen
        throw redirect({ to: "/getting-started" });
      }
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
