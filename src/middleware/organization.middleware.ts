import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authClient } from "@/lib/auth-client";

export const organizationMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const request = getRequest();
  if (!request) {
    throw new Error("Request context not available.");
  }
  const { headers } = request;

  // First get the session to check for organization
  const session = await authClient.getSession({ fetchOptions: { headers } });

  let organization = null;

  if (session?.data?.user) {
    organization = await authClient.organization.getFullOrganization({
      fetchOptions: { headers },
    });
  }

  return next({ context: { organization } });
});
