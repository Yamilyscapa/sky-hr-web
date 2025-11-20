import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authClient } from "@/lib/auth-client";

export type ProtectedContextResult = {
  isAuthenticated: boolean;
  isMember: boolean;
  user: Record<string, any> | null;
  session: Record<string, any> | null;
  organization: Awaited<
    ReturnType<typeof authClient.organization.getFullOrganization>
  > | null;
};

/**
 * Aggregates the authentication data we need for protected routes. This avoids
 * multiple round trips for every navigation by fetching session, organization
 * and membership info at once.
 */
export const getProtectedContext = createServerFn({
  method: "GET",
}).handler(async (): Promise<ProtectedContextResult> => {
  const request = getRequest();
  if (!request) {
    throw new Error("Request context not available.");
  }

  const { headers } = request;
  const session = await authClient.getSession({ fetchOptions: { headers } });
  const sessionData = session?.data ?? null;
  const user = sessionData?.user ?? null;

  if (!user) {
    return {
      isAuthenticated: false,
      isMember: false,
      user: null,
      session: sessionData,
      organization: null,
    };
  }

  const [organizationResult, membersResult] = await Promise.allSettled([
    authClient.organization.getFullOrganization({ fetchOptions: { headers } }),
    authClient.organization.listMembers({ fetchOptions: { headers } }),
  ]);

  const organization =
    organizationResult.status === "fulfilled" ? organizationResult.value : null;

  let isMember = true;
  if (membersResult.status === "fulfilled") {
    const members = membersResult.value.data?.members ?? [];
    const role = members.find((member) => member.user?.id === user.id)?.role;
    isMember = role !== "owner" && role !== "admin";
  }

  return {
    isAuthenticated: true,
    isMember,
    user,
    session: sessionData,
    organization,
  };
});
