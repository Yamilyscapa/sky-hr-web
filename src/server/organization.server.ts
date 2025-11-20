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

export const setFirstOrganizationActive = createServerFn({
  method: "GET",
}).handler(async () => {
  const request = getRequest();
  if (!request) {
    throw new Error("Request context not available.");
  }
  const { headers } = request;

  // Get user's organizations
  const organizations = await authClient.organization.list({
    fetchOptions: { headers },
  });

  // Set the first organization as active if available
  if (organizations.data && organizations.data.length > 0) {
    const firstOrg = organizations.data[0];
    if (firstOrg.id) {
      const result = await authClient.organization.setActive({
        organizationId: firstOrg.id,
        fetchOptions: { headers },
      });
      return result;
    }
  }

  return null;
});

export const setActiveOrganizationBySlug = createServerFn({
  method: "POST",
}).handler(async ({ data }) => {
  const request = getRequest();
  if (!request) {
    throw new Error("Request context not available.");
  }

  const slug = typeof data?.slug === "string" ? data.slug.trim() : "";
  if (!slug) {
    throw new Error("Organization slug is required.");
  }

  const { headers } = request;

  await authClient.organization.setActive({
    organizationSlug: slug,
    fetchOptions: { headers },
  });

  const organization = await authClient.organization.getFullOrganization({
    fetchOptions: { headers },
  });

  return organization;
});
