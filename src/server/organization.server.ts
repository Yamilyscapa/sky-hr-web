import { organizationMiddleware } from "@/middleware/organization.middleware";
import { createServerFn } from "@tanstack/react-start";
import { authClient } from "@/lib/auth-client";
import { getRequest } from "@tanstack/react-start/server";

export const getOrganization = createServerFn({
  method: "GET",
})
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    return context.organization;
  });

export const getUserOrganizations = createServerFn({
  method: "GET",
}).handler(async () => {
  const request = getRequest();
  if (!request) {
    throw new Error("Request context not available.");
  }
  const { headers } = request;

  const organizations = await authClient.organization.list({
    fetchOptions: { headers },
  });

  return organizations;
});

export const getUserInvitations = createServerFn({
  method: "GET",
}).handler(async () => {
  const request = getRequest();
  if (!request) {
    throw new Error("Request context not available.");
  }
  const { headers } = request;

  const invitations = await authClient.organization.listUserInvitations({
    fetchOptions: { headers },
  });

  return invitations;
});
