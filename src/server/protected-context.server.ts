import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authClient } from "@/lib/auth-client";

type OrganizationRole = "owner" | "admin" | "member";
type MembershipStatus = OrganizationRole | "none" | "unknown";

function normalizeRole(role: unknown): OrganizationRole | null {
  if (typeof role !== "string") {
    return null;
  }

  const normalized = role.toLowerCase();
  return normalized === "owner" || normalized === "admin" || normalized === "member"
    ? normalized
    : null;
}

function getRoleFromMemberships(
  memberships: any,
  orgId?: string | null,
): OrganizationRole | null {
  if (!Array.isArray(memberships)) {
    return null;
  }

  const targetMembership = memberships.find((membership: any) => {
    if (!membership) return false;
    if (orgId) {
      return (
        membership.organizationId === orgId ||
        membership.organization_id === orgId
      );
    }
    return Boolean(membership.role);
  });

  return normalizeRole(targetMembership?.role);
}

function inferRoleFromSessionData(
  sessionData: Record<string, any> | null,
  user: Record<string, any> | null,
  organizationId?: string | null,
): OrganizationRole | null {
  if (!sessionData) {
    return null;
  }

  const { session } = sessionData;
  const orgId =
    organizationId ??
    session?.activeOrganization?.id ??
    session?.organization?.id ??
    null;

  const candidates = [
    normalizeRole(session?.activeOrganization?.role),
    normalizeRole(session?.organization?.role),
    normalizeRole(session?.member?.role),
    normalizeRole(session?.currentMember?.role),
    normalizeRole(session?.membership?.role),
    getRoleFromMemberships(session?.memberships, orgId),
    normalizeRole(user?.member?.role),
    normalizeRole(user?.currentMember?.role),
    normalizeRole(user?.membership?.role),
    getRoleFromMemberships(user?.memberships, orgId),
  ].filter(Boolean) as Array<OrganizationRole>;

  return candidates[0] ?? null;
}

type PendingInvitation = {
  id?: string;
  status?: string;
  [key: string]: any;
};

export type ProtectedContextResult = {
  isAuthenticated: boolean;
  isMember: boolean;
  membershipStatus: MembershipStatus;
  user: Record<string, any> | null;
  session: Record<string, any> | null;
  organization: Awaited<
    ReturnType<typeof authClient.organization.getFullOrganization>
  > | null;
  pendingInvitations: PendingInvitation[];
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
      membershipStatus: "none",
      user: null,
      session: sessionData,
      organization: null,
      pendingInvitations: [],
    };
  }

  const [organizationResult, membersResult, invitationsResult] = await Promise.allSettled([
    authClient.organization.getFullOrganization({ fetchOptions: { headers } }),
    authClient.organization.listMembers({ fetchOptions: { headers } }),
    authClient.organization.listUserInvitations({ fetchOptions: { headers } }),
  ]);

  const organization =
    organizationResult.status === "fulfilled" ? organizationResult.value : null;
  const organizationData = (organization?.data ?? null) as Record<string, any> | null;
  const organizationId =
    organizationData?.organization?.id ??
    organizationData?.id ??
    null;

  const fallbackRole = inferRoleFromSessionData(sessionData, user, organizationId);
  let membershipStatus: MembershipStatus = fallbackRole ?? "unknown";
  if (!organizationData) {
    membershipStatus = "none";
  }

  if (membersResult.status === "fulfilled") {
    const members = membersResult.value.data?.members ?? [];
    const role = normalizeRole(
      members.find((member) => member.user?.id === user.id)?.role,
    );

    if (role) {
      membershipStatus = role;
    }
  } else if (membersResult.status === "rejected") {
    console.warn("Failed to load organization members:", membersResult.reason);
  }

  const pendingInvitations: PendingInvitation[] =
    invitationsResult.status === "fulfilled"
      ? (Array.isArray(invitationsResult.value?.data)
          ? invitationsResult.value.data
          : Array.isArray((invitationsResult.value?.data as any)?.invitations)
            ? (invitationsResult.value?.data as any).invitations
            : []
        ).filter((invitation: PendingInvitation) => invitation?.status === "pending")
      : [];

  const isMember =
    membershipStatus === "member" || membershipStatus === "unknown" || membershipStatus === "none";

  return {
    isAuthenticated: true,
    isMember,
    membershipStatus,
    user,
    session: sessionData,
    organization,
    pendingInvitations,
  };
});
